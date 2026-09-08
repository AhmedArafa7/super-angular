const express = require('express');
const router = express.Router();
const githubConfig = require('../config/github-app.config');
const githubTools = require('../services/github-tools.service');
const { SecurityError } = require('../security/agent-guard');

// Error responder middleware
function handleToolError(res, err, defaultMsg) {
  if (err instanceof SecurityError) {
    return res.status(err.status || 403).json({
      success: false,
      securityBlocked: true,
      code: err.code,
      message: err.message,
      details: err.details
    });
  }

  const status = err.status || 500;
  return res.status(status).json({
    success: false,
    code: err.code || 'TOOL_EXECUTION_ERROR',
    message: err.message || defaultMsg
  });
}

/**
 * 1. Health & Config Status Check
 */
router.get('/status', (req, res) => {
  const status = githubConfig.getStatus();
  res.json({
    service: 'GitHub Agent Gateway',
    timestamp: Date.now(),
    ...status
  });
});

/**
 * 2. Tool: Get Repository Info
 * Body: { installationId, owner, repo }
 */
router.post('/tools/repo-info', async (req, res) => {
  try {
    const { installationId, owner, repo } = req.body;
    if (!installationId || !owner || !repo) {
      return res.status(400).json({ error: 'installationId, owner, and repo are required.' });
    }

    const result = await githubTools.getRepoInfo({ installationId, owner, repo });
    res.json(result);
  } catch (err) {
    handleToolError(res, err, 'Failed to fetch repository information.');
  }
});

/**
 * 3. Tool: Get Repository Tree
 * Body: { installationId, owner, repo, branch, recursive }
 */
router.post('/tools/tree', async (req, res) => {
  try {
    const { installationId, owner, repo, branch, recursive } = req.body;
    if (!installationId || !owner || !repo) {
      return res.status(400).json({ error: 'installationId, owner, and repo are required.' });
    }

    const result = await githubTools.getRepoTree({
      installationId,
      owner,
      repo,
      branch,
      recursive: recursive !== false
    });
    res.json(result);
  } catch (err) {
    handleToolError(res, err, 'Failed to fetch repository tree.');
  }
});

/**
 * 4. Tool: Read File Content
 * Body: { installationId, owner, repo, path, branch }
 */
router.post('/tools/read', async (req, res) => {
  try {
    const { installationId, owner, repo, path: filePath, branch } = req.body;
    if (!installationId || !owner || !repo || !filePath) {
      return res.status(400).json({ error: 'installationId, owner, repo, and path are required.' });
    }

    const result = await githubTools.readFile({
      installationId,
      owner,
      repo,
      path: filePath,
      branch
    });
    res.json(result);
  } catch (err) {
    handleToolError(res, err, 'Failed to read file content.');
  }
});

/**
 * 5. Tool: Create Feature Branch
 * Body: { installationId, owner, repo, newBranch, baseBranch }
 */
router.post('/tools/branch', async (req, res) => {
  try {
    const { installationId, owner, repo, newBranch, baseBranch } = req.body;
    if (!installationId || !owner || !repo || !newBranch) {
      return res.status(400).json({ error: 'installationId, owner, repo, and newBranch are required.' });
    }

    const result = await githubTools.createBranch({
      installationId,
      owner,
      repo,
      newBranch,
      baseBranch
    });
    res.json(result);
  } catch (err) {
    handleToolError(res, err, 'Failed to create feature branch.');
  }
});

/**
 * 6. Tool: Write / Modify File
 * Body: { installationId, owner, repo, branch, path, content, commitMessage, allowWorkflowsChange }
 */
router.post('/tools/write', async (req, res) => {
  try {
    const {
      installationId,
      owner,
      repo,
      branch,
      path: filePath,
      content,
      commitMessage,
      allowWorkflowsChange
    } = req.body;

    if (!installationId || !owner || !repo || !branch || !filePath || content === undefined) {
      return res.status(400).json({
        error: 'installationId, owner, repo, branch, path, and content are required.'
      });
    }

    const result = await githubTools.writeFile({
      installationId,
      owner,
      repo,
      branch,
      path: filePath,
      content,
      commitMessage,
      allowWorkflowsChange: !!allowWorkflowsChange
    });
    res.json(result);
  } catch (err) {
    handleToolError(res, err, 'Failed to write file to repository.');
  }
});

/**
 * 7. Tool: Create Pull Request (NO AUTO MERGE)
 * Body: { installationId, owner, repo, title, body, headBranch, baseBranch }
 */
router.post('/tools/pr', async (req, res) => {
  try {
    const {
      installationId,
      owner,
      repo,
      title,
      body,
      headBranch,
      baseBranch
    } = req.body;

    if (!installationId || !owner || !repo || !headBranch) {
      return res.status(400).json({
        error: 'installationId, owner, repo, and headBranch are required.'
      });
    }

    const result = await githubTools.createPullRequest({
      installationId,
      owner,
      repo,
      title,
      body,
      headBranch,
      baseBranch
    });
    res.json(result);
  } catch (err) {
    handleToolError(res, err, 'Failed to create pull request.');
  }
});

module.exports = router;
