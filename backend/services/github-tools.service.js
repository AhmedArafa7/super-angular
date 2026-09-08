const githubConfig = require('../config/github-app.config');
const { AgentSecurityGuard, SecurityError } = require('../security/agent-guard');

// Simple structured logger for agent actions
function logAgentAction(action, metadata, status = 'SUCCESS', error = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action: `[GitHubTools:${action}]`,
    status,
    ...metadata
  };

  if (error) {
    logEntry.errorMessage = error.message || String(error);
    logEntry.errorCode = error.code || 'UNKNOWN_ERROR';
    console.error(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

class GitHubToolsService {
  /**
   * Helper to retrieve authenticated octokit instance with rate limit check
   */
  getOctokit(installationId) {
    AgentSecurityGuard.checkRateLimit(installationId);
    return githubConfig.getInstallationOctokit(installationId);
  }

  /**
   * Tool 1: Get Repository Information (Language, default branch, etc.)
   */
  async getRepoInfo({ installationId, owner, repo }) {
    const startTime = Date.now();
    try {
      const octokit = this.getOctokit(installationId);
      await AgentSecurityGuard.validateRepositoryAccess(octokit, owner, repo);

      const { data } = await octokit.repos.get({ owner, repo });

      logAgentAction('getRepoInfo', {
        owner,
        repo,
        durationMs: Date.now() - startTime
      });

      return {
        success: true,
        data: {
          fullName: data.full_name,
          defaultBranch: data.default_branch,
          language: data.language,
          description: data.description,
          isPrivate: data.private,
          stars: data.stargazers_count,
          openIssuesCount: data.open_issues_count
        }
      };
    } catch (err) {
      logAgentAction('getRepoInfo', { owner, repo }, 'FAILED', err);
      throw err;
    }
  }

  /**
   * Tool 2: Get Repository File Tree
   */
  async getRepoTree({ installationId, owner, repo, branch = null, recursive = true }) {
    const startTime = Date.now();
    try {
      const octokit = this.getOctokit(installationId);
      await AgentSecurityGuard.validateRepositoryAccess(octokit, owner, repo);

      // If branch not specified, fetch default branch
      let targetBranch = branch;
      if (!targetBranch) {
        const repoInfo = await octokit.repos.get({ owner, repo });
        targetBranch = repoInfo.data.default_branch;
      }

      AgentSecurityGuard.validateBranch(targetBranch, false);

      // Get latest commit SHA on branch
      const branchRef = await octokit.repos.getBranch({
        owner,
        repo,
        branch: targetBranch
      });
      const treeSha = branchRef.data.commit.commit.tree.sha;

      // Get Git Tree
      const { data } = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: treeSha,
        recursive: recursive ? '1' : '0'
      });

      // Filter out internal and hidden nodes for security & token economy
      const sanitizedTree = (data.tree || [])
        .filter(item => !item.path.startsWith('.git/'))
        .map(item => ({
          path: item.path,
          mode: item.mode,
          type: item.type, // 'blob' (file) or 'tree' (dir)
          size: item.size || 0
        }));

      logAgentAction('getRepoTree', {
        owner,
        repo,
        branch: targetBranch,
        itemCount: sanitizedTree.length,
        durationMs: Date.now() - startTime
      });

      return {
        success: true,
        branch: targetBranch,
        tree: sanitizedTree
      };
    } catch (err) {
      logAgentAction('getRepoTree', { owner, repo, branch }, 'FAILED', err);
      throw err;
    }
  }

  /**
   * Tool 3: Read Specific File Content
   */
  async readFile({ installationId, owner, repo, path: filePath, branch = null }) {
    const startTime = Date.now();
    try {
      const octokit = this.getOctokit(installationId);
      await AgentSecurityGuard.validateRepositoryAccess(octokit, owner, repo);

      const validatedPath = AgentSecurityGuard.validateFilePath(filePath);
      if (branch) {
        AgentSecurityGuard.validateBranch(branch, false);
      }

      const params = {
        owner,
        repo,
        path: validatedPath
      };
      if (branch) params.ref = branch;

      const { data } = await octokit.repos.getContent(params);

      if (Array.isArray(data) || data.type !== 'file') {
        throw new Error(`المسار (${validatedPath}) هو مجلد وليس ملفاً قابلاً للقراءة.`);
      }

      // Decode base64 file content
      const content = Buffer.from(data.content, 'base64').toString('utf8');

      logAgentAction('readFile', {
        owner,
        repo,
        path: validatedPath,
        sizeBytes: data.size,
        durationMs: Date.now() - startTime
      });

      return {
        success: true,
        path: validatedPath,
        sha: data.sha,
        size: data.size,
        content
      };
    } catch (err) {
      logAgentAction('readFile', { owner, repo, path: filePath }, 'FAILED', err);
      throw err;
    }
  }

  /**
   * Tool 4: Create a New Feature Branch
   */
  async createBranch({ installationId, owner, repo, newBranch, baseBranch = null }) {
    const startTime = Date.now();
    try {
      const octokit = this.getOctokit(installationId);
      await AgentSecurityGuard.validateRepositoryAccess(octokit, owner, repo);

      const targetBranchName = AgentSecurityGuard.validateBranch(newBranch, true);

      // Determine base branch
      let base = baseBranch;
      if (!base) {
        const repoData = await octokit.repos.get({ owner, repo });
        base = repoData.data.default_branch;
      }
      AgentSecurityGuard.validateBranch(base, false);

      // Get latest SHA of base branch
      const baseRef = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${base}`
      });
      const baseSha = baseRef.data.object.sha;

      // Create new Git reference (branch)
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${targetBranchName}`,
        sha: baseSha
      });

      logAgentAction('createBranch', {
        owner,
        repo,
        newBranch: targetBranchName,
        baseBranch: base,
        durationMs: Date.now() - startTime
      });

      return {
        success: true,
        message: `تم إنشاء الفرع بنجاح: ${targetBranchName}`,
        branch: targetBranchName,
        baseBranch: base,
        sha: baseSha
      };
    } catch (err) {
      // If branch already exists
      if (err.status === 422 && err.message?.includes('already exists')) {
        return {
          success: true,
          message: `الفرع (${newBranch}) موجود بالفعل ويمكن استخدامه.`,
          branch: newBranch,
          alreadyExisted: true
        };
      }

      logAgentAction('createBranch', { owner, repo, newBranch }, 'FAILED', err);
      throw err;
    }
  }

  /**
   * Tool 5: Write / Create / Update File inside a Feature Branch
   */
  async writeFile({
    installationId,
    owner,
    repo,
    branch,
    path: filePath,
    content,
    commitMessage = null,
    allowWorkflowsChange = false
  }) {
    const startTime = Date.now();
    try {
      const octokit = this.getOctokit(installationId);
      await AgentSecurityGuard.validateRepositoryAccess(octokit, owner, repo);

      // Strict Defense-in-depth: writing is forbidden directly on protected base branches
      const targetBranch = AgentSecurityGuard.validateBranch(branch, true);
      const validatedPath = AgentSecurityGuard.validateFilePath(filePath, { allowWorkflowsChange });

      if (typeof content !== 'string') {
        throw new Error('محتوى الملف يجب أن يكون نصياً (string).');
      }

      // Check if file already exists on this branch to obtain SHA for update
      let fileSha = undefined;
      try {
        const existing = await octokit.repos.getContent({
          owner,
          repo,
          path: validatedPath,
          ref: targetBranch
        });
        if (!Array.isArray(existing.data) && existing.data.sha) {
          fileSha = existing.data.sha;
        }
      } catch (checkErr) {
        // 404 is normal when creating a new file
        if (checkErr.status !== 404) throw checkErr;
      }

      const defaultMsg = fileSha
        ? `chore(ai): update ${validatedPath}`
        : `feat(ai): create ${validatedPath}`;
      const msg = (commitMessage || defaultMsg).trim();

      // Encode content to Base64
      const base64Content = Buffer.from(content, 'utf8').toString('base64');

      // Commit changes to the feature branch
      const res = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: validatedPath,
        branch: targetBranch,
        message: msg,
        content: base64Content,
        sha: fileSha
      });

      logAgentAction('writeFile', {
        owner,
        repo,
        branch: targetBranch,
        path: validatedPath,
        action: fileSha ? 'UPDATE' : 'CREATE',
        commitSha: res.data.commit.sha,
        durationMs: Date.now() - startTime
      });

      return {
        success: true,
        path: validatedPath,
        branch: targetBranch,
        action: fileSha ? 'updated' : 'created',
        commitSha: res.data.commit.sha,
        htmlUrl: res.data.content?.html_url
      };
    } catch (err) {
      logAgentAction('writeFile', { owner, repo, branch, path: filePath }, 'FAILED', err);
      throw err;
    }
  }

  /**
   * Tool 6: Create Pull Request (Final step - NO AUTOMATIC MERGE)
   */
  async createPullRequest({
    installationId,
    owner,
    repo,
    title,
    body,
    headBranch,
    baseBranch = null
  }) {
    const startTime = Date.now();
    try {
      const octokit = this.getOctokit(installationId);
      await AgentSecurityGuard.validateRepositoryAccess(octokit, owner, repo);

      // Determine default base branch if not provided
      let base = baseBranch;
      if (!base) {
        const repoData = await octokit.repos.get({ owner, repo });
        base = repoData.data.default_branch;
      }

      const validated = AgentSecurityGuard.validatePullRequestParams(headBranch, base);

      const prTitle = (title || 'AI Feature Implementation').trim();
      const prBody = (body || 'Automated feature created by Si-Neuro Personal Assistant. Please review changes before merging.').trim();

      const { data } = await octokit.pulls.create({
        owner,
        repo,
        title: prTitle,
        body: prBody,
        head: validated.head,
        base: validated.base
      });

      logAgentAction('createPullRequest', {
        owner,
        repo,
        prNumber: data.number,
        head: validated.head,
        base: validated.base,
        durationMs: Date.now() - startTime
      });

      return {
        success: true,
        prNumber: data.number,
        prUrl: data.html_url,
        title: data.title,
        head: data.head.ref,
        base: data.base.ref,
        state: data.state
      };
    } catch (err) {
      // If PR already exists
      if (err.status === 422 && err.message?.includes('A pull request already exists')) {
        return {
          success: true,
          message: 'يوجد Pull Request مفتوح بالفعل لهذا الفرع.',
          alreadyExisted: true
        };
      }

      logAgentAction('createPullRequest', { owner, repo, headBranch, baseBranch }, 'FAILED', err);
      throw err;
    }
  }
}

module.exports = new GitHubToolsService();
