#!/usr/bin/env node

const { spawnSync } = require('child_process');
const { TOOL_WORKFLOW_CONTRACT, TOOL_ORDER } = require('./lib/tool-workflow-contract');

function parseArgs(argv) {
  const options = {
    format: 'text',
    tool: null
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--format=')) {
      options.format = arg.split('=')[1] || 'text';
      continue;
    }
    if (arg === '--format') {
      options.format = argv[i + 1] || 'text';
      i++;
      continue;
    }
    if (arg.startsWith('--tool=')) {
      options.tool = arg.split('=')[1] || null;
      continue;
    }
    if (arg === '--tool') {
      options.tool = argv[i + 1] || null;
      i++;
      continue;
    }
  }

  return options;
}

function createUsageError(message) {
  const error = new Error(message);
  error.exitCode = 2;
  return error;
}

function resolveSelectedTools(tool) {
  if (!tool) {
    return TOOL_ORDER;
  }

  if (!TOOL_ORDER.includes(tool)) {
    throw createUsageError('smoke tool-setups requires --tool <claude|cursor|codex>');
  }

  return [tool];
}

function getSpawnImpl(options) {
  return options.spawnImpl || spawnSync;
}

function shouldResolveWindowsShim(command, platform) {
  return platform === 'win32' && !/[\\/]/.test(command) && !/\.[a-z0-9]+$/i.test(command);
}

function tryResolveWithShell(spawnImpl, shell, command) {
  const result = spawnImpl(
    shell,
    [
      '-NoProfile',
      '-Command',
      `(Get-Command '${command}' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)`
    ],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15000
    }
  );

  if (result.error && result.error.code === 'ENOENT') {
    return null;
  }

  if (result.status !== 0) {
    return null;
  }

  const resolvedPath = (result.stdout || '').trim();
  return resolvedPath || null;
}

function resolveWindowsShim(probe, options = {}) {
  const spawnImpl = getSpawnImpl(options);
  const platform = options.platform || process.platform;
  const command = probe.command;

  if (!shouldResolveWindowsShim(command, platform)) {
    return null;
  }

  for (const shell of ['pwsh', 'powershell']) {
    const resolvedPath = tryResolveWithShell(spawnImpl, shell, command);
    if (!resolvedPath) {
      continue;
    }

    if (/\.ps1$/i.test(resolvedPath)) {
      return {
        command: shell,
        args: ['-NoProfile', '-File', resolvedPath, ...probe.args]
      };
    }

    if (/\.(cmd|bat)$/i.test(resolvedPath)) {
      return {
        command: 'cmd.exe',
        args: ['/d', '/s', '/c', resolvedPath, ...probe.args]
      };
    }

    return {
      command: resolvedPath,
      args: probe.args
    };
  }

  return null;
}

function handleSpawnError(error, commandText) {
  if (error.code === 'ENOENT') {
    return {
      status: 'SKIP',
      command: commandText,
      detail: 'command not installed'
    };
  }

  if (['EPERM', 'EACCES'].includes(error.code)) {
    return {
      status: 'SKIP',
      command: commandText,
      detail: `probe blocked by local environment (${error.code}); rerun in a shell/session that allows local process spawn`
    };
  }

  return {
    status: 'FAIL',
    command: commandText,
    detail: error.message
  };
}

function summarizeProbeDetail(rawDetail) {
  const detail = String(rawDetail || '').trim();
  if (!detail) {
    return 'ok';
  }

  const firstLine = detail.split(/\r?\n/, 1)[0].trim();
  if (firstLine.length <= 160) {
    return firstLine;
  }

  return `${firstLine.slice(0, 157)}...`;
}

function runProbe(probe, options = {}) {
  const spawnImpl = getSpawnImpl(options);
  const commandText = [probe.command, ...probe.args].join(' ');
  const resolvedProbe = resolveWindowsShim(probe, options) || probe;
  const result = spawnImpl(resolvedProbe.command, resolvedProbe.args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 15000
  });

  if (result.error) {
    return handleSpawnError(result.error, commandText);
  }

  if (result.status !== 0) {
    return {
      status: 'FAIL',
      command: commandText,
      detail: summarizeProbeDetail(result.stderr || result.stdout || `exit ${result.status}`)
    };
  }

  return {
    status: 'PASS',
    command: commandText,
    detail: summarizeProbeDetail(result.stdout || result.stderr || 'ok')
  };
}

function summarizeTool(tool, probes, options = {}) {
  const results = probes.map(probe => runProbe(probe, options));
  const hasPass = results.some(result => result.status === 'PASS');
  const hasFail = results.some(result => result.status === 'FAIL');

  return {
    tool,
    status: hasPass ? 'PASS' : hasFail ? 'FAIL' : 'SKIP',
    probes: results
  };
}

function smokeToolSetups(options = {}) {
  const io = options.io || console;
  const selectedTools = resolveSelectedTools(options.tool);
  const summaries = selectedTools.map(tool =>
    summarizeTool(tool, TOOL_WORKFLOW_CONTRACT.smokeProbes[tool] || [], options)
  );
  const failed = summaries.filter(summary => summary.status === 'FAIL');
  const passed = summaries.filter(summary => summary.status === 'PASS');
  const skipped = summaries.filter(summary => summary.status === 'SKIP');

  const result = {
    ok: failed.length === 0,
    passed: passed.length,
    failed: failed.length,
    skipped: skipped.length,
    tools: summaries
  };

  if (options.format === 'json') {
    io.log(JSON.stringify(result, null, 2));
  } else {
    io.log('Tool setup smoke checks:');
    for (const summary of summaries) {
      io.log(`- ${summary.tool}: ${summary.status}`);
      for (const probe of summary.probes) {
        io.log(`  ${probe.status} ${probe.command} - ${probe.detail}`);
      }
    }
    io.log(`Passed: ${result.passed}`);
    io.log(`Failed: ${result.failed}`);
    io.log(`Skipped: ${result.skipped}`);
  }

  return {
    exitCode: result.ok ? 0 : 1,
    result
  };
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const { exitCode } = smokeToolSetups({ format: args.format, tool: args.tool });
    process.exit(exitCode);
  } catch (error) {
    console.error(error.message || String(error));
    process.exit(error.exitCode || 1);
  }
}

module.exports = {
  resolveWindowsShim,
  runProbe,
  summarizeTool,
  summarizeProbeDetail,
  smokeToolSetups
};
