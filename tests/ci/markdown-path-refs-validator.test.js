const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, createTestDir, cleanupTestDir } = require('../helpers/test-runner');
const { runValidatorFunction } = require('../helpers/validator-test-utils');

function writeFile(baseDir, relativePath, content) {
  const filePath = path.join(baseDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function runTests() {
  console.log('\n=== Testing validate-markdown-path-refs.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('passes on real project runtime-critical markdown', () => {
    const result = runValidatorFunction('validate-markdown-path-refs');
    assert.strictEqual(result.code, 0, `Should pass, got stderr: ${result.stderr}`);
    assert.ok(result.stdout.includes('Validated'), 'Should output validation count');
  })) passed++; else failed++;

  if (test('fails on missing repo path in inline code', () => {
    const rootDir = createTestDir();
    writeFile(rootDir, 'README.md', '# Doc\nUse `scripts/missing-tool.js` before deploy.');

    const result = runValidatorFunction('validate-markdown-path-refs', {
      rootDir,
      targetPaths: [path.join(rootDir, 'README.md')]
    });

    assert.strictEqual(result.code, 1, 'Should fail on missing inline-code path');
    assert.ok(result.stderr.includes('scripts/missing-tool.js'), 'Should report missing path');
    cleanupTestDir(rootDir);
  })) passed++; else failed++;

  if (test('passes on existing repo path in inline code', () => {
    const rootDir = createTestDir();
    writeFile(rootDir, 'README.md', '# Doc\nUse `scripts/tool.js` before deploy.');
    writeFile(rootDir, 'scripts/tool.js', 'console.log("ok");');

    const result = runValidatorFunction('validate-markdown-path-refs', {
      rootDir,
      targetPaths: [path.join(rootDir, 'README.md')]
    });

    assert.strictEqual(result.code, 0, 'Should pass on existing inline-code path');
    cleanupTestDir(rootDir);
  })) passed++; else failed++;

  if (test('fails on missing plain-text repo path', () => {
    const rootDir = createTestDir();
    writeFile(rootDir, 'AGENTS.md', '# Agents\nUpdate scripts/ghost.js if the runtime changes.');

    const result = runValidatorFunction('validate-markdown-path-refs', {
      rootDir,
      targetPaths: [path.join(rootDir, 'AGENTS.md')]
    });

    assert.strictEqual(result.code, 1, 'Should fail on missing plain-text path');
    assert.ok(result.stderr.includes('scripts/ghost.js'), 'Should report missing plain-text path');
    cleanupTestDir(rootDir);
  })) passed++; else failed++;

  if (test('ignores markdown links already validated elsewhere', () => {
    const rootDir = createTestDir();
    writeFile(rootDir, 'README.md', '# Doc\nSee [tool](scripts/missing-tool.js).');

    const result = runValidatorFunction('validate-markdown-path-refs', {
      rootDir,
      targetPaths: [path.join(rootDir, 'README.md')]
    });

    assert.strictEqual(result.code, 0, 'Should ignore markdown links');
    cleanupTestDir(rootDir);
  })) passed++; else failed++;

  if (test('ignores fenced code blocks and non-repo paths', () => {
    const rootDir = createTestDir();
    writeFile(
      rootDir,
      'README.md',
      '# Doc\n```bash\nscripts/missing-tool.js\npython manage.py migrate\n```\nUse `python manage.py migrate` locally.\n'
    );

    const result = runValidatorFunction('validate-markdown-path-refs', {
      rootDir,
      targetPaths: [path.join(rootDir, 'README.md')]
    });

    assert.strictEqual(result.code, 0, 'Should ignore fenced code and non-repo paths');
    cleanupTestDir(rootDir);
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
