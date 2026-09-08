/**
 * Agent Security Guardrails (Defense-in-Depth)
 * Enforces strict boundaries on any GitHub operations requested by AI agents.
 */

class SecurityError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    this.details = details;
    this.status = 403;
  }
}

// Protected branch list: Commits are strictly blocked on these branches.
const PROTECTED_BRANCHES = new Set([
  'main',
  'master',
  'prod',
  'production',
  'release',
  'dev',
  'develop',
  'development',
  'staging',
  'trunk',
  'live'
]);

// Sensitive and forbidden file patterns (blocked by default)
const FORBIDDEN_FILE_PATTERNS = [
  // Secrets and environment files
  /^\.env(\..+)?$/i,
  /.*\.pem$/i,
  /.*\.key$/i,
  /.*\.pfx$/i,
  /.*\.p12$/i,
  /.*\.pkcs12$/i,
  /.*id_rsa(\.pub)?$/i,
  /.*id_ed25519(\.pub)?$/i,
  /credentials\.json$/i,
  /service-account.*\.json$/i,
  /.*secret.*/i,
  /.*token.*/i,
  // Internal git internals
  /^\.git(\/|\\)/i,
  /^\.git$/i
];

// Workflow directory requiring explicit human approval
const WORKFLOWS_DIR_PREFIX = '.github/workflows';

// In-memory rate limiter per installation ID (sliding window)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_OPERATIONS_PER_MINUTE = 30;
const MAX_FILE_WRITES_PER_SESSION = 20;

class AgentSecurityGuard {
  /**
   * 1. Validate target branch name
   * @param {string} branch - The branch to check
   * @param {boolean} isWrite - True if operation writes or modifies code
   */
  validateBranch(branch, isWrite = false) {
    if (!branch || typeof branch !== 'string') {
      throw new SecurityError('INVALID_BRANCH', 'اسم الفرع غير صالح أو مفقود.');
    }

    const cleanBranch = branch.trim();

    // Prevent branch injection or malformed names
    if (
      cleanBranch.includes('..') ||
      cleanBranch.includes(' ') ||
      cleanBranch.includes('~') ||
      cleanBranch.includes('^') ||
      cleanBranch.includes(':') ||
      cleanBranch.includes('?') ||
      cleanBranch.includes('*') ||
      cleanBranch.includes('[') ||
      cleanBranch.startsWith('/') ||
      cleanBranch.endsWith('/') ||
      cleanBranch.endsWith('.lock')
    ) {
      throw new SecurityError('MALFORMED_BRANCH', `اسم الفرع (${cleanBranch}) يحتوي على رموز غير مسموحة في Git.`);
    }

    // Defense-in-depth: block any write operation targeting protected base branches
    if (isWrite && PROTECTED_BRANCHES.has(cleanBranch.toLowerCase())) {
      throw new SecurityError(
        'PROTECTED_BRANCH_WRITE_BLOCKED',
        `⛔ محظور أمنياً: لا يمكن للمساعد التعديل أو الكتابة المباشرة على فرع الإنتاج/الأساسي (${cleanBranch}). يجب العمل داخل فرع مستقل (Feature Branch) ثم فتح Pull Request.`
      );
    }

    return cleanBranch;
  }

  /**
   * 2. Validate file path (Path traversal, secrets, and workflows approval)
   * @param {string} filePath - Target file path
   * @param {object} options - Security flags (e.g. allowWorkflowsChange)
   */
  validateFilePath(filePath, options = {}) {
    if (!filePath || typeof filePath !== 'string') {
      throw new SecurityError('INVALID_PATH', 'مسار الملف غير صالح أو مفقود.');
    }

    // Normalize forward slashes and trim
    let normalized = filePath.trim().replace(/\\/g, '/');

    // Remove leading slashes
    while (normalized.startsWith('/')) {
      normalized = normalized.slice(1);
    }

    // Path traversal checks
    if (
      normalized.includes('../') ||
      normalized.includes('/..') ||
      normalized === '..' ||
      normalized.includes('\0') ||
      /^[a-zA-Z]:/.test(normalized) // Windows drive letter
    ) {
      throw new SecurityError('PATH_TRAVERSAL_DETECTED', `⛔ محظور أمنياً: تم رصد محاولة Path Traversal في المسار (${filePath}).`);
    }

    const filename = normalized.split('/').pop() || normalized;

    // Allow .env.example while blocking actual .env
    if (filename.toLowerCase() === '.env.example') {
      return normalized;
    }

    // Check sensitive / secret patterns
    for (const pattern of FORBIDDEN_FILE_PATTERNS) {
      if (pattern.test(filename) || pattern.test(normalized)) {
        throw new SecurityError(
          'SENSITIVE_FILE_BLOCKED',
          `⛔ محظور أمنياً: محاولة تعديل أو إنشاء ملف أسرار أو بيانات حساسة (${filename}).`
        );
      }
    }

    // Check .github/workflows explicit approval rule
    if (normalized.toLowerCase().startsWith(WORKFLOWS_DIR_PREFIX)) {
      if (!options.allowWorkflowsChange) {
        throw new SecurityError(
          'WORKFLOW_APPROVAL_REQUIRED',
          `⚠️ يتطلب موافقة بشرية صريحة: تعديل ملفات مسارات العمل الآلية (${normalized}) قد يؤثر على الـ CI/CD. يرجى تفعيل الموافقة الصريحة للمتابعة.`,
          { requiresApproval: true, targetPath: normalized }
        );
      }
    }

    return normalized;
  }

  /**
   * 3. Validate that the target repository is accessible to the given installation
   * @param {object} octokit - Scoped installation Octokit instance
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   */
  async validateRepositoryAccess(octokit, owner, repo) {
    if (!owner || !repo) {
      throw new SecurityError('INVALID_REPO_TARGET', 'اسم المستودع أو المالك غير محدد.');
    }

    try {
      // Query accessible repos for this installation
      const { data } = await octokit.apps.listReposAccessibleToInstallation({
        per_page: 100
      });

      const accessible = data.repositories || [];
      const fullName = `${owner}/${repo}`.toLowerCase();
      const isAllowed = accessible.some(r => r.full_name.toLowerCase() === fullName);

      if (!isAllowed) {
        throw new SecurityError(
          'REPOSITORY_ACCESS_DENIED',
          `⛔ محظور أمنياً: المستودع (${owner}/${repo}) غير مدرج ضمن المستودعات المصرح بها في تطبيق GitHub App الخاص بك.`
        );
      }

      return true;
    } catch (err) {
      if (err instanceof SecurityError) throw err;
      throw new SecurityError(
        'REPO_VERIFICATION_FAILED',
        `فشل التحقق من أذونات المستودع: ${err.message || 'خطأ غير معروف'}`
      );
    }
  }

  /**
   * 4. Rate Limiter (Defense against runaway loops or abuse)
   * @param {string|number} key - Identifier (installationId or IP)
   */
  checkRateLimit(key) {
    const now = Date.now();
    const id = String(key);
    let record = rateLimitMap.get(id);

    if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
      record = { startTime: now, count: 1 };
      rateLimitMap.set(id, record);
      return;
    }

    record.count++;
    if (record.count > MAX_OPERATIONS_PER_MINUTE) {
      throw new SecurityError(
        'RATE_LIMIT_EXCEEDED',
        `تم تجاوز الحد الأقصى للعمليات (${MAX_OPERATIONS_PER_MINUTE} عملية/دقيقة). يرجى الانتظار دقيقة واحدة حفاظاً على الحصة.`
      );
    }
  }

  /**
   * 5. Pull Request validation
   * @param {string} headBranch - Feature branch name
   * @param {string} baseBranch - Target branch to merge into (e.g. main)
   */
  validatePullRequestParams(headBranch, baseBranch) {
    if (!headBranch || !baseBranch) {
      throw new SecurityError('INVALID_PR_BRANCHES', 'يجب تحديد كل من فرع التعديلات (Head) والفرع المستهدف (Base).');
    }

    if (headBranch.trim().toLowerCase() === baseBranch.trim().toLowerCase()) {
      throw new SecurityError('IDENTICAL_PR_BRANCHES', 'لا يمكن فتح Pull Request بين نفس الفرع.');
    }

    return {
      head: headBranch.trim(),
      base: baseBranch.trim()
    };
  }
}

module.exports = {
  AgentSecurityGuard: new AgentSecurityGuard(),
  SecurityError,
  PROTECTED_BRANCHES
};
