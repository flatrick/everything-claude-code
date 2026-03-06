/**
 * Tests for scripts/hooks/command-hooks.js
 *
 * Run with: node tests/hooks/command-hooks.test.js
 */

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');
const { ensureSubprocessCapability } = require('../helpers/subprocess-capability');
const { test } = require('../helpers/test-runner');

function runHook(mode, stdin = '', env = {}) {
  return spawnSync('node', [path.join(__dirname, '..', '..', 'scripts', 'hooks', 'command-hooks.js'), mode], {
    input: stdin,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 15000,
    env: { ...process.env, ...env },
  });
}

function runTests() {
  console.log('\n=== Testing command-hooks.js ===\n');

  let passed = 0;
  let failed = 0;

  const inputJson = JSON.stringify({ tool_input: { command: 'echo hello' } });

  if (test('passes through stdin exactly (no added newline)', () => {
    const result = runHook('pre-git-push-reminder', inputJson);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout, inputJson);
  })) passed++; else failed++;

  if (test('unknown mode exits 0 and logs warning', () => {
    const result = runHook('unknown-mode', inputJson);
    assert.strictEqual(result.status, 0);
    assert.ok(result.stderr.includes('[Hook] Unknown mode: unknown-mode'));
  })) passed++; else failed++;

  if (test('pre-git-push-reminder warns on git push command', () => {
    const stdin = JSON.stringify({ tool_input: { command: 'git push origin main' } });
    const result = runHook('pre-git-push-reminder', stdin);
    assert.strictEqual(result.status, 0);
    assert.ok(result.stderr.includes('Review changes before push'));
  })) passed++; else failed++;

  if (test('post-pr-review-reminder prints review command from PR URL', () => {
    const stdin = JSON.stringify({
      tool_input: { command: 'gh pr create --fill' },
      tool_output: { output: 'Created pull request: https://github.com/acme/repo/pull/123' },
    });
    const result = runHook('post-pr-review-reminder', stdin);
    assert.strictEqual(result.status, 0);
    assert.ok(result.stderr.includes('PR created: https://github.com/acme/repo/pull/123'));
    assert.ok(result.stderr.includes('gh pr review 123 --repo acme/repo'));
  })) passed++; else failed++;

  if (test('post-build-async-reminder logs on build command', () => {
    const stdin = JSON.stringify({ tool_input: { command: 'yarn build' } });
    const result = runHook('post-build-async-reminder', stdin);
    assert.strictEqual(result.status, 0);
    assert.ok(result.stderr.includes('Build completed - async analysis running in background'));
  })) passed++; else failed++;

  if (test('pre-tmux-reminder does not false-positive on bare yarn command', () => {
    const stdin = JSON.stringify({ tool_input: { command: 'yarn' } });
    const result = runHook('pre-tmux-reminder', stdin, { TMUX: '' });
    assert.strictEqual(result.status, 0);
    assert.ok(!result.stderr.includes('Consider running in tmux'));
  })) passed++; else failed++;

  if (test('pre-tmux-reminder logs for npm test when tmux is absent (non-Windows)', () => {
    const stdin = JSON.stringify({ tool_input: { command: 'npm test' } });
    const result = runHook('pre-tmux-reminder', stdin, { TMUX: '' });
    assert.strictEqual(result.status, 0);
    if (process.platform === 'win32') {
      assert.ok(!result.stderr.includes('Consider running in tmux'));
    } else {
      assert.ok(result.stderr.includes('Consider running in tmux'));
    }
  })) passed++; else failed++;

  if (test('pre-dev-tmux-block exits 2 on dev server commands (non-Windows)', () => {
    const stdin = JSON.stringify({ tool_input: { command: 'npm run dev' } });
    const result = runHook('pre-dev-tmux-block', stdin);
    if (process.platform === 'win32') {
      assert.strictEqual(result.status, 0);
    } else {
      assert.strictEqual(result.status, 2);
      assert.ok(result.stderr.includes('BLOCKED: Dev server must run in tmux'));
    }
  })) passed++; else failed++;

  if (test('handles invalid JSON input gracefully and preserves stdout', () => {
    const stdin = '{ invalid json';
    const result = runHook('pre-git-push-reminder', stdin);
    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout, stdin);
  })) passed++; else failed++;

  console.log('\n=== Test Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

ensureSubprocessCapability('tests/hooks/command-hooks.test.js');
runTests();

