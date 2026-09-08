const { AgentSecurityGuard, SecurityError } = require('./security/agent-guard');

console.log('=== STARTING AGENT SECURITY GUARD UNIT TESTS ===\n');

let passedTests = 0;
let totalTests = 0;

function assertThrows(testName, fn, expectedCode) {
  totalTests++;
  try {
    fn();
    console.error(`❌ [FAIL] ${testName} - Expected to throw ${expectedCode}, but succeeded!`);
  } catch (err) {
    if (err instanceof SecurityError && err.code === expectedCode) {
      console.log(`✅ [PASS] ${testName} - Correctly blocked with code: ${err.code}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName} - Threw unexpected error: ${err.name} (${err.code}): ${err.message}`);
    }
  }
}

function assertAllowed(testName, fn) {
  totalTests++;
  try {
    const res = fn();
    console.log(`✅ [PASS] ${testName} - Allowed as expected: ${JSON.stringify(res)}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${testName} - Was blocked unexpectedly: ${err.message}`);
  }
}

// 1. Branch Protection Tests
assertThrows('Write directly to main', () => AgentSecurityGuard.validateBranch('main', true), 'PROTECTED_BRANCH_WRITE_BLOCKED');
assertThrows('Write directly to master', () => AgentSecurityGuard.validateBranch('master', true), 'PROTECTED_BRANCH_WRITE_BLOCKED');
assertThrows('Write directly to production', () => AgentSecurityGuard.validateBranch('production', true), 'PROTECTED_BRANCH_WRITE_BLOCKED');
assertThrows('Write directly to release', () => AgentSecurityGuard.validateBranch('release', true), 'PROTECTED_BRANCH_WRITE_BLOCKED');
assertThrows('Malformed branch with double dots', () => AgentSecurityGuard.validateBranch('feat/test..branch', true), 'MALFORMED_BRANCH');
assertThrows('Malformed branch with spaces', () => AgentSecurityGuard.validateBranch('feat/my new branch', true), 'MALFORMED_BRANCH');
assertAllowed('Read from main branch', () => AgentSecurityGuard.validateBranch('main', false));
assertAllowed('Write to feature branch', () => AgentSecurityGuard.validateBranch('feature/add-products-page', true));

// 2. Path Traversal & Security Tests
assertThrows('Path traversal with ../', () => AgentSecurityGuard.validateFilePath('../../config/secrets.json'), 'PATH_TRAVERSAL_DETECTED');
assertThrows('Path traversal in nested folder', () => AgentSecurityGuard.validateFilePath('src/app/../../../etc/passwd'), 'PATH_TRAVERSAL_DETECTED');
assertThrows('Sensitive file: .env', () => AgentSecurityGuard.validateFilePath('.env'), 'SENSITIVE_FILE_BLOCKED');
assertThrows('Sensitive file: .env.production', () => AgentSecurityGuard.validateFilePath('.env.production'), 'SENSITIVE_FILE_BLOCKED');
assertThrows('Sensitive file: id_rsa', () => AgentSecurityGuard.validateFilePath('keys/id_rsa'), 'SENSITIVE_FILE_BLOCKED');
assertThrows('Sensitive file: cert.pem', () => AgentSecurityGuard.validateFilePath('cert.pem'), 'SENSITIVE_FILE_BLOCKED');
assertThrows('Sensitive file: credentials.json', () => AgentSecurityGuard.validateFilePath('credentials.json'), 'SENSITIVE_FILE_BLOCKED');
assertAllowed('Allow .env.example', () => AgentSecurityGuard.validateFilePath('.env.example'));
assertAllowed('Allow standard source file', () => AgentSecurityGuard.validateFilePath('src/app/features/products.ts'));

// 3. GitHub Workflows Approval Tests
assertThrows('Modify workflow without approval', () => AgentSecurityGuard.validateFilePath('.github/workflows/ci.yml', { allowWorkflowsChange: false }), 'WORKFLOW_APPROVAL_REQUIRED');
assertAllowed('Modify workflow with explicit approval', () => AgentSecurityGuard.validateFilePath('.github/workflows/ci.yml', { allowWorkflowsChange: true }));

// 4. Pull Request Validation Tests
assertThrows('PR with identical head and base', () => AgentSecurityGuard.validatePullRequestParams('main', 'main'), 'IDENTICAL_PR_BRANCHES');
assertAllowed('Valid PR branches', () => AgentSecurityGuard.validatePullRequestParams('feature/products', 'main'));

console.log(`\n=== RESULTS: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
process.exit(passedTests === totalTests ? 0 : 1);
