const assert = require('assert');
const { test } = require('../helpers/test-runner');
const {
  buildCiCommand,
  main,
  normalizeJsonResult,
  parseCommonOptions
} = require('../../scripts/mdt');

function createIo() {
  const stdout = [];
  const stderr = [];
  return {
    io: {
      log: (message) => stdout.push(String(message)),
      error: (message) => stderr.push(String(message))
    },
    stdout,
    stderr
  };
}

function runMain(argv, options = {}) {
  const output = createIo();
  const exitCode = main(argv, { ...output, ...options });
  return {
    exitCode,
    stdout: output.stdout.join('\n'),
    stderr: output.stderr.join('\n')
  };
}

function runTests() {
  console.log('\n=== Testing mdt CLI ===\n');

  let passed = 0;
  let failed = 0;

  if (test('parseCommonOptions normalizes shared umbrella flags', () => {
    const parsed = parseCommonOptions([
      '--format', 'json',
      '--cwd', '.',
      '--tool', 'cursor',
      '--config-root', '.cursor',
      '--surface', 'rules',
      '--dry-run',
      '--dev',
      'typescript'
    ]);

    assert.strictEqual(parsed.format, 'json');
    assert.strictEqual(parsed.tool, 'cursor');
    assert.strictEqual(parsed.surface, 'rules');
    assert.strictEqual(parsed.dryRun, true);
    assert.strictEqual(parsed.dev, true);
    assert.deepStrictEqual(parsed.positionals, ['typescript']);
  })) passed++; else failed++;

  if (test('unknown umbrella option exits with usage error', () => {
    const result = runMain(['install', '--repo', '.']);
    assert.strictEqual(result.exitCode, 2);
    assert.ok(result.stderr.includes('Unknown option: --repo'));
  })) passed++; else failed++;

  if (test('smoke workflows cursor dispatch succeeds on the real repository', () => {
    const result = runMain(['smoke', 'workflows', '--tool', 'cursor']);
    assert.strictEqual(result.exitCode, 0, result.stderr || result.stdout);
    assert.ok(result.stdout.includes('Cursor workflow smoke'));
  })) passed++; else failed++;

  if (test('emits a WSL performance warning for Windows-mounted workspaces', () => {
    const result = runMain(
      ['smoke', 'tool-setups', '--cwd', '/mnt/c/src/repository'],
      {
        detectEnv: {
          getWorkspaceInfo: () => ({
            path: '/mnt/c/src/repository',
            isWSL: true,
            workspaceKind: 'wsl-windows-mounted',
            shouldWarnPerformance: true
          })
        }
      }
    );
    assert.strictEqual(result.exitCode, 0, result.stderr || result.stdout);
    assert.ok(result.stderr.includes('WSL detected and workspace is on a Windows-mounted filesystem'));
    assert.ok(result.stderr.includes('/mnt/c/src/repository'));
  })) passed++; else failed++;

  if (test('does not emit a WSL performance warning for Linux-native workspaces', () => {
    const result = runMain(
      ['smoke', 'tool-setups', '--cwd', '/home/wsl-user/src/repository'],
      {
        detectEnv: {
          getWorkspaceInfo: () => ({
            path: '/home/wsl-user/src/repository',
            isWSL: true,
            workspaceKind: 'wsl-native',
            shouldWarnPerformance: false
          })
        }
      }
    );
    assert.strictEqual(result.exitCode, 0, result.stderr || result.stdout);
    assert.ok(!result.stderr.includes('WSL detected and workspace is on a Windows-mounted filesystem'));
  })) passed++; else failed++;

  if (test('smoke workflows codex supports umbrella json output', () => {
    const result = runMain(['smoke', 'workflows', '--tool', 'codex', '--format', 'json']);
    assert.strictEqual(result.exitCode, 0, result.stderr || result.stdout);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.ok, true);
    assert.strictEqual(payload.command, 'smoke workflows codex');
    assert.ok(payload.data.stdout.includes('"ok": true') || payload.data.stdout.includes('Codex workflow smoke'));
  })) passed++; else failed++;

  if (test('normalizeJsonResult wraps child output in the shared envelope', () => {
    const payload = normalizeJsonResult('install', 1, 'stdout line', 'stderr line');
    assert.strictEqual(payload.ok, false);
    assert.strictEqual(payload.command, 'install');
    assert.strictEqual(payload.data.exitCode, 1);
    assert.ok(payload.errors[0].message.includes('stderr line'));
  })) passed++; else failed++;

  if (test('ci validate all runs validators through the shared dispatcher', () => {
    const invoked = [];
    const result = buildCiCommand(['validate', 'all'], {
      execScript: (validatorName, options) => {
        invoked.push({
          validatorName,
          commandName: `ci validate ${validatorName}`
        });
        return { exitCode: 0, stdout: `ci validate ${validatorName}`, stderr: '' };
      }
    });

    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(invoked.length >= 5, true);
    assert.ok(invoked.some((entry) => entry.validatorName === 'agents'));
    assert.ok(invoked.some((entry) => entry.validatorName === 'install-packages'));
    assert.ok(invoked.some((entry) => entry.validatorName === 'docs-consistency'));
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
