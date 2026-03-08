/**
 * Tests for validate-markdown-links.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, createTestDir, cleanupTestDir } = require('../helpers/test-runner');
const { runValidatorFunction } = require('../helpers/validator-test-utils');

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function runValidator(repoRoot) {
  return runValidatorFunction('validate-markdown-links', { repoRoot });
}

function runTests() {
  console.log('\n=== Testing validate-markdown-links.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('passes on real project markdown files', () => {
    const result = runValidator(process.cwd());
    assert.strictEqual(result.code, 0, `Should pass, got stderr: ${result.stderr}`);
    assert.ok(result.stdout.includes('Validated'), 'Should report validation summary');
  })) passed++; else failed++;

  if (test('fails on missing relative markdown file', () => {
    const repoRoot = createTestDir('mdt-md-links-');
    writeFile(path.join(repoRoot, 'README.md'), '[Broken](./missing.md)\n');

    try {
      const result = runValidator(repoRoot);
      assert.strictEqual(result.code, 1, 'Should fail for missing local markdown target');
      assert.ok(result.stderr.includes('broken local link target'), 'Should report missing local target');
    } finally {
      cleanupTestDir(repoRoot);
    }
  })) passed++; else failed++;

  if (test('passes on valid relative markdown file and heading anchor', () => {
    const repoRoot = createTestDir('mdt-md-links-');
    writeFile(path.join(repoRoot, 'README.md'), '[Guide](./docs/guide.md#getting-started)\n');
    writeFile(path.join(repoRoot, 'docs', 'guide.md'), '# Getting Started\n\nHello\n');

    try {
      const result = runValidator(repoRoot);
      assert.strictEqual(result.code, 0, `Should pass, got stderr: ${result.stderr}`);
    } finally {
      cleanupTestDir(repoRoot);
    }
  })) passed++; else failed++;

  if (test('fails on broken same-file anchor', () => {
    const repoRoot = createTestDir('mdt-md-links-');
    writeFile(path.join(repoRoot, 'README.md'), '# Home\n\n[Jump](#missing-anchor)\n');

    try {
      const result = runValidator(repoRoot);
      assert.strictEqual(result.code, 1, 'Should fail for broken same-file anchor');
      assert.ok(result.stderr.includes('broken markdown anchor'), 'Should report broken anchor');
    } finally {
      cleanupTestDir(repoRoot);
    }
  })) passed++; else failed++;

  if (test('skips external urls instead of failing offline', () => {
    const repoRoot = createTestDir('mdt-md-links-');
    writeFile(path.join(repoRoot, 'README.md'), '[Vendor](https://example.com/docs)\n');

    try {
      const result = runValidator(repoRoot);
      assert.strictEqual(result.code, 0, 'Should not fail on external links');
      assert.ok(result.stdout.includes('external links skipped'), 'Should report skipped external links');
    } finally {
      cleanupTestDir(repoRoot);
    }
  })) passed++; else failed++;

  if (test('ignores markdown-looking links inside fenced code blocks', () => {
    const repoRoot = createTestDir('mdt-md-links-');
    writeFile(
      path.join(repoRoot, 'README.md'),
      '```md\n[Broken](./missing.md)\n```\n\n[Real](./docs/guide.md)\n'
    );
    writeFile(path.join(repoRoot, 'docs', 'guide.md'), '# Guide\n');

    try {
      const result = runValidator(repoRoot);
      assert.strictEqual(result.code, 0, `Should ignore code-block links, got stderr: ${result.stderr}`);
    } finally {
      cleanupTestDir(repoRoot);
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
