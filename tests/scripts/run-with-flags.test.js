/**
 * Tests for scripts/hooks/run-with-flags.js
 */

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');
const { ensureSubprocessCapability } = require('../helpers/subprocess-capability');
const { test } = require('../helpers/test-runner');
const { buildTestEnv } = require('../helpers/test-env-profiles');

const repoRoot = path.join(__dirname, '..', '..');
const runnerPath = path.join(repoRoot, 'scripts', 'hooks', 'run-with-flags.js');

function runWithFlags(env) {
  return spawnSync(
    'node',
    [runnerPath, 'test:hook', 'scripts/hooks/session-start.js', 'minimal,standard,strict'],
    {
      encoding: 'utf8',
      cwd: repoRoot,
      env: buildTestEnv('neutral', env),
      input: '{}',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000
    }
  );
}

function runTests() {
  console.log('\n=== Testing run-with-flags.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('uses MDT_ROOT when it is set', () => {
    const result = runWithFlags({
      MDT_ROOT: repoRoot
    });

    assert.strictEqual(result.status, 0, `Should exit 0, got ${result.status}`);
    assert.ok(!result.stderr.includes('Script not found'), 'Should resolve the hook script from MDT_ROOT');
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

ensureSubprocessCapability('tests/scripts/run-with-flags.test.js');
runTests();
