'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createTestDir, cleanupTestDir } = require('../helpers/test-runner');
const { buildTestEnv } = require('../helpers/test-env-profiles');

const repoRoot = path.join(__dirname, '..', '..');
const installerPath = path.join(repoRoot, 'scripts', 'install-mdt.js');

function runNodeScript(scriptPath, args = [], options = {}) {
  return spawnSync('node', [scriptPath, ...args], {
    encoding: 'utf8',
    cwd: options.cwd || repoRoot,
    env: buildTestEnv(options.profile || 'neutral', options.env || {}),
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: options.timeoutMs || 20000
  });
}

function assertSuccess(result, context) {
  assert.strictEqual(
    result.status,
    0,
    `${context} should exit 0, got ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}

function installTarget(target, packages, options = {}) {
  const tmpHome = createTestDir(`compat-${target}-home-`);
  const overrideRoot = path.join(tmpHome, `.${target === 'claude' ? 'claude' : target}`);
  const env = {
    HOME: tmpHome,
    USERPROFILE: tmpHome,
    ...(options.env || {})
  };
  if (target === 'claude') {
    env.CLAUDE_BASE_DIR = overrideRoot;
  }

  const args = [];
  if (target !== 'claude') {
    args.push('--target', target);
  }
  if (options.dev) {
    args.push('--dev');
  }
  args.push(...packages);

  const result = runNodeScript(installerPath, ['--override', overrideRoot, ...args], {
    env,
    cwd: options.cwd || repoRoot,
    profile: options.profile || 'neutral',
    timeoutMs: options.timeoutMs
  });
  assertSuccess(result, `${target} install`);

  return {
    tmpHome,
    overrideRoot,
    env,
    result
  };
}

function cleanupInstall(fixture) {
  cleanupTestDir(fixture.tmpHome);
}

function ensureFile(filePath) {
  assert.ok(fs.existsSync(filePath), `Expected file to exist: ${filePath}`);
}

function resolveInstalledMdtScript(overrideRoot) {
  return path.join(overrideRoot, 'mdt', 'scripts', 'mdt.js');
}

function runInstalledMdt(fixture, args = [], options = {}) {
  return runNodeScript(resolveInstalledMdtScript(fixture.overrideRoot), args, {
    cwd: options.cwd || repoRoot,
    env: {
      ...fixture.env,
      ...(options.env || {})
    },
    profile: options.profile || 'neutral',
    timeoutMs: options.timeoutMs
  });
}

function createCliShimBin(commands) {
  const binDir = createTestDir('compat-cli-shims-');
  const commandEntries = Object.entries(commands || {});

  for (const [commandName, responses] of commandEntries) {
    if (process.platform === 'win32') {
      const shimPath = path.join(binDir, `${commandName}.cmd`);
      const lines = [
        '@echo off',
        'setlocal'
      ];

      for (const [args, rawResponse] of Object.entries(responses || {})) {
        const response = typeof rawResponse === 'string'
          ? { stdout: rawResponse, exitCode: 0 }
          : { stdout: '', stderr: '', exitCode: 0, ...rawResponse };
        lines.push(`if "%*"=="${String(args).replace(/%/g, '%%')}" (`);
        if (response.stdout) {
          lines.push(`  echo ${String(response.stdout).replace(/%/g, '%%')}`);
        }
        if (response.stderr) {
          lines.push(`  >&2 echo ${String(response.stderr).replace(/%/g, '%%')}`);
        }
        lines.push(`  exit /b ${response.exitCode}`);
        lines.push(')');
      }

      lines.push('>&2 echo unexpected args: %*');
      lines.push('exit /b 1');
      fs.writeFileSync(shimPath, `${lines.join('\r\n')}\r\n`, 'utf8');
      continue;
    }

    const shimPath = path.join(binDir, commandName);
    const lines = [
      '#!/bin/sh',
      'set -eu',
      'case "$*" in'
    ];

    for (const [args, rawResponse] of Object.entries(responses || {})) {
      const response = typeof rawResponse === 'string'
        ? { stdout: rawResponse, exitCode: 0 }
        : { stdout: '', stderr: '', exitCode: 0, ...rawResponse };
      lines.push(`  ${JSON.stringify(args)})`);
      if (response.stdout) {
        lines.push(`    printf '%s\\n' ${JSON.stringify(String(response.stdout))}`);
      }
      if (response.stderr) {
        lines.push(`    printf '%s\\n' ${JSON.stringify(String(response.stderr))} >&2`);
      }
      lines.push(`    exit ${response.exitCode}`);
      lines.push('    ;;');
    }

    lines.push('  *)');
    lines.push(`    printf '%s\\n' ${JSON.stringify(`unexpected args: ${commandName} $*`)} >&2`);
    lines.push('    exit 1');
    lines.push('    ;;');
    lines.push('esac');

    fs.writeFileSync(shimPath, `${lines.join('\n')}\n`, 'utf8');
    fs.chmodSync(shimPath, 0o755);
  }

  return binDir;
}

function getPathEnvKey(env = process.env) {
  return Object.keys(env).find((key) => key.toLowerCase() === 'path')
    || Object.keys(process.env).find((key) => key.toLowerCase() === 'path')
    || 'PATH';
}

function prependPath(binDir, env = process.env) {
  const pathKey = getPathEnvKey(env);
  const existingPath = env[pathKey]
    || env.PATH
    || env.Path
    || process.env[pathKey]
    || process.env.PATH
    || process.env.Path
    || '';
  return {
    [pathKey]: `${binDir}${path.delimiter}${existingPath}`
  };
}

module.exports = {
  cleanupInstall,
  createCliShimBin,
  ensureFile,
  installTarget,
  prependPath,
  repoRoot,
  resolveInstalledMdtScript,
  runInstalledMdt,
  runNodeScript,
  assertSuccess
};
