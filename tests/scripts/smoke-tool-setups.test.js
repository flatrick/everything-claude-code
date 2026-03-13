const assert = require('assert');
const { test } = require('../helpers/test-runner');
const { resolveWindowsShim, runProbe, smokeToolSetups, summarizeProbeDetail } = require('../../scripts/smoke-tool-setups');

function runTests() {
  console.log('\n=== Testing smoke-tool-setups.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('returns SKIP when the command is not installed', () => {
    const probe = runProbe(
      { command: 'missing-tool', args: ['--help'] },
      {
        spawnImpl: () => ({
          error: Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' })
        })
      }
    );

    assert.strictEqual(probe.status, 'SKIP');
  })) passed++; else failed++;

  if (test('resolves Windows PowerShell shims before probing', () => {
    const resolved = resolveWindowsShim(
      { command: 'codex', args: ['--version'] },
      {
        platform: 'win32',
        spawnImpl: (command, args) => {
          assert.strictEqual(command, 'pwsh');
          assert.strictEqual(args[2], "(Get-Command 'codex' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)");
          return {
            status: 0,
            stdout: 'C:\\nvm4w\\nodejs\\codex.ps1\n'
          };
        }
      }
    );

    assert.deepStrictEqual(resolved, {
      command: 'pwsh',
      args: ['-NoProfile', '-File', 'C:\\nvm4w\\nodejs\\codex.ps1', '--version']
    });
  })) passed++; else failed++;

  if (test('wraps Windows cmd shims through cmd.exe before probing', () => {
    const resolved = resolveWindowsShim(
      { command: 'claude', args: ['--help'] },
      {
        platform: 'win32',
        spawnImpl: (command, args) => {
          assert.strictEqual(command, 'pwsh');
          assert.strictEqual(args[2], "(Get-Command 'claude' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)");
          return {
            status: 0,
            stdout: 'C:\\tools\\claude.cmd\n'
          };
        }
      }
    );

    assert.deepStrictEqual(resolved, {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'C:\\tools\\claude.cmd', '--help']
    });
  })) passed++; else failed++;

  if (test('returns SKIP when the local environment blocks process spawn', () => {
    const probe = runProbe(
      { command: 'claude', args: ['--help'] },
      {
        spawnImpl: () => ({
          error: Object.assign(new Error('spawn EPERM'), { code: 'EPERM' })
        })
      }
    );

    assert.strictEqual(probe.status, 'SKIP');
    assert.ok(probe.detail.includes('EPERM'));
    assert.ok(probe.detail.includes('allows local process spawn'));
  })) passed++; else failed++;

  if (test('returns FAIL when an installed command exits non-zero', () => {
    const probe = runProbe(
      { command: 'codex', args: ['--help'] },
      {
        spawnImpl: () => ({
          status: 2,
          stderr: 'bad exit'
        })
      }
    );

    assert.strictEqual(probe.status, 'FAIL');
    assert.ok(probe.detail.includes('bad exit'));
  })) passed++; else failed++;

  if (test('returns PASS when a probe succeeds', () => {
    const probe = runProbe(
      { command: 'codex', args: ['--version'] },
      {
        platform: 'linux',
        spawnImpl: () => ({ status: 0, stdout: 'codex 1.0.0' })
      }
    );

    assert.strictEqual(probe.status, 'PASS');
    assert.ok(probe.detail.includes('codex 1.0.0'));
  })) passed++; else failed++;

  if (test('summarizes multi-line help output to the first line only', () => {
    const summary = summarizeProbeDetail('Codex CLI\nUsage: codex [options]\nMore help');
    assert.strictEqual(summary, 'Codex CLI');
  })) passed++; else failed++;

  if (test('filters tool setup smoke to a single requested tool', () => {
    const output = [];
    const calls = [];
    const result = smokeToolSetups({
      tool: 'codex',
      platform: 'linux',
      io: {
        log: message => output.push(String(message))
      },
      spawnImpl: (command, args) => {
        calls.push(`${command} ${args.join(' ')}`);
        return { status: 0, stdout: 'codex 1.0.0' };
      }
    });

    assert.strictEqual(result.exitCode, 0, output.join('\n'));
    assert.deepStrictEqual(calls, ['codex --version', 'codex --help']);
    assert.ok(output.join('\n').includes('- codex: PASS'));
    assert.ok(!output.join('\n').includes('- claude:'));
    assert.ok(!output.join('\n').includes('- cursor:'));
    assert.ok(output.join('\n').includes('Passed: 1'));
    assert.ok(output.join('\n').includes('Failed: 0'));
    assert.ok(output.join('\n').includes('Skipped: 0'));
  })) passed++; else failed++;

  if (test('emits json output for a single requested tool only', () => {
    const output = [];
    const result = smokeToolSetups({
      tool: 'cursor',
      platform: 'linux',
      format: 'json',
      io: {
        log: message => output.push(String(message))
      },
      spawnImpl: () => ({ status: 0, stdout: 'cursor-agent 1.0.0' })
    });

    assert.strictEqual(result.exitCode, 0);
    const payload = JSON.parse(output.join('\n'));
    assert.strictEqual(payload.tools.length, 1);
    assert.strictEqual(payload.tools[0].tool, 'cursor');
    assert.strictEqual(payload.passed, 1);
    assert.strictEqual(payload.failed, 0);
    assert.strictEqual(payload.skipped, 0);
  })) passed++; else failed++;

  if (test('summarizes tools with PASS, SKIP, and FAIL states', () => {
    const output = [];
    const result = smokeToolSetups({
      spawnImpl: (command, args) => {
        const joined = `${command} ${args.join(' ')}`;
        if (joined === 'claude --version') return { status: 0, stdout: '2.1.71' };
        if (joined === 'claude --help') return { status: 0, stdout: 'help' };
        if (joined === 'cursor --version') {
          return { error: Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' }) };
        }
        if (joined === 'agent --help') {
          return { error: Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' }) };
        }
        if (joined === 'cursor-agent --help') {
          return { error: Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' }) };
        }
        return { status: 1, stderr: 'broken' };
      },
      io: {
        log: message => output.push(String(message))
      }
    });

    assert.strictEqual(result.exitCode, 1, 'Expected failure when at least one installed tool is broken');
    assert.ok(output.join('\n').includes('claude: PASS'));
    assert.ok(output.join('\n').includes('cursor: SKIP'));
    assert.ok(output.join('\n').includes('codex: FAIL'));
    assert.ok(output.join('\n').includes('Passed: 1'));
    assert.ok(output.join('\n').includes('Failed: 1'));
    assert.ok(output.join('\n').includes('Skipped: 1'));
  })) passed++; else failed++;

  if (test('uses resolved Windows shim path for successful probe execution', () => {
    const calls = [];
    const probe = runProbe(
      { command: 'codex', args: ['--help'] },
      {
        platform: 'win32',
        spawnImpl: (command, args) => {
          calls.push({ command, args });
          if (command === 'pwsh' && args[1] === '-Command') {
            return {
              status: 0,
              stdout: 'C:\\nvm4w\\nodejs\\codex.ps1\n'
            };
          }

          if (command === 'pwsh' && args[1] === '-File') {
            return {
              status: 0,
              stdout: 'Codex help'
            };
          }

          throw new Error(`Unexpected call: ${command} ${args.join(' ')}`);
        }
      }
    );

    assert.strictEqual(probe.status, 'PASS');
    assert.strictEqual(calls.length, 2);
    assert.strictEqual(calls[1].command, 'pwsh');
    assert.deepStrictEqual(calls[1].args, ['-NoProfile', '-File', 'C:\\nvm4w\\nodejs\\codex.ps1', '--help']);
  })) passed++; else failed++;

  if (test('uses cmd.exe when the resolved Windows shim is a cmd file', () => {
    const calls = [];
    const probe = runProbe(
      { command: 'cursor-agent', args: ['--help'] },
      {
        platform: 'win32',
        spawnImpl: (command, args) => {
          calls.push({ command, args });
          if (command === 'pwsh' && args[1] === '-Command') {
            return {
              status: 0,
              stdout: 'C:\\tools\\cursor-agent.cmd\n'
            };
          }

          if (command === 'cmd.exe') {
            return {
              status: 0,
              stdout: 'cursor-agent help'
            };
          }

          throw new Error(`Unexpected call: ${command} ${args.join(' ')}`);
        }
      }
    );

    assert.strictEqual(probe.status, 'PASS');
    assert.strictEqual(calls.length, 2);
    assert.strictEqual(calls[1].command, 'cmd.exe');
    assert.deepStrictEqual(calls[1].args, ['/d', '/s', '/c', 'C:\\tools\\cursor-agent.cmd', '--help']);
  })) passed++; else failed++;

  console.log('\n=== Test Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
