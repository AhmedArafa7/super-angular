const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');

// Load environment variables if dotenv is available and file exists
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  // Dotenv optional in production environments like Render where process.env is injected
}

class GitHubAppConfig {
  constructor() {
    this.appId = process.env.GITHUB_APP_ID || null;
    this.clientId = process.env.GITHUB_CLIENT_ID || null;
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || null;
    this.privateKey = this.resolvePrivateKey();
  }

  // Resolve private key either from raw PEM string or path to a .pem file
  resolvePrivateKey() {
    const rawKey = process.env.GITHUB_PRIVATE_KEY;
    if (!rawKey) return null;

    // Case A: File path provided
    if (rawKey.endsWith('.pem') || rawKey.endsWith('.key')) {
      const resolvedPath = path.isAbsolute(rawKey) ? rawKey : path.join(__dirname, '..', rawKey);
      if (fs.existsSync(resolvedPath)) {
        return fs.readFileSync(resolvedPath, 'utf8');
      }
    }

    // Case B: Raw PEM string with escaped newlines
    if (rawKey.includes('BEGIN') && rawKey.includes('PRIVATE KEY')) {
      return rawKey.replace(/\\n/g, '\n');
    }

    return rawKey;
  }

  isConfigured() {
    return !!(this.appId && this.privateKey);
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      hasAppId: !!this.appId,
      hasPrivateKey: !!this.privateKey,
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      appId: this.appId || 'Not Set'
    };
  }

  // Create an Octokit instance authenticated as the GitHub App (for app-level management)
  getAppOctokit() {
    if (!this.isConfigured()) {
      throw new Error('GitHub App is not configured. Missing GITHUB_APP_ID or GITHUB_PRIVATE_KEY in backend environment.');
    }

    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: this.appId,
        privateKey: this.privateKey,
        clientId: this.clientId,
        clientSecret: this.clientSecret
      }
    });
  }

  // Create an Octokit instance authenticated for a specific installation (scoped repo access)
  getInstallationOctokit(installationId) {
    if (!this.isConfigured()) {
      throw new Error('GitHub App is not configured. Missing GITHUB_APP_ID or GITHUB_PRIVATE_KEY in backend environment.');
    }

    if (!installationId) {
      throw new Error('installationId is required to generate scoped GitHub App token.');
    }

    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: this.appId,
        privateKey: this.privateKey,
        installationId: Number(installationId),
        clientId: this.clientId,
        clientSecret: this.clientSecret
      }
    });
  }
}

module.exports = new GitHubAppConfig();
