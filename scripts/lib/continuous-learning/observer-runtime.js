'use strict';

const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const {
  createContinuousLearningContext,
  inferInstalledConfigDir,
  inferToolFromConfigDir
} = require('./runtime-context');

const DEFAULT_CONFIG = {
  run_interval_minutes: 5,
  min_observations_to_analyze: 20,
  enabled: false,
  tool: null,
  models: {
    claude: 'haiku',
    cursor: 'auto',
    codex: ''
  },
  commands: {
    claude: 'claude',
    cursor: 'agent',
    codex: 'codex'
  }
};

function mergeObserverConfig(base, overrides) {
  return {
    ...base,
    ...overrides,
    models: {
      ...(base.models || {}),
      ...((overrides && overrides.models) || {})
    },
    commands: {
      ...(base.commands || {}),
      ...((overrides && overrides.commands) || {})
    }
  };
}

function buildAnalysisPrompt(projectName, observationsFile, instinctsDir) {
  return `Read ${observationsFile} and identify patterns for the project '${projectName}'. If you find 3+ occurrences of the same pattern, create an instinct file in ${instinctsDir}/<id>.md. Use YAML frontmatter with id, trigger, confidence, domain, source, scope.`;
}

function buildAnalyzerInvocation(options) {
  const {
    tool,
    config,
    prompt,
    workspace
  } = options;
  const model = config.models && config.models[tool] ? config.models[tool] : '';
  const command = config.commands && config.commands[tool] ? config.commands[tool] : '';

  if (tool === 'claude') {
    const args = ['--print', '--max-turns', '3'];
    if (model) {
      args.push('--model', model);
    }
    args.push(prompt);
    return { command: command || 'claude', args, model };
  }

  if (tool === 'cursor') {
    const args = ['--print', '--trust'];
    if (workspace) {
      args.push('--workspace', workspace);
    }
    if (model) {
      args.push('--model', model);
    }
    args.push(prompt);
    return { command: command || 'agent', args, model };
  }

  if (tool === 'codex') {
    const args = ['exec', '--full-auto'];
    if (workspace) {
      args.push('-C', workspace);
    }
    if (model) {
      args.push('--model', model);
    }
    args.push(prompt);
    return { command: command || 'codex', args, model };
  }

  throw new Error(`Unsupported observer tool '${tool}'`);
}

function shouldResolveWindowsSpawnCommand(command, platform = process.platform) {
  return platform === 'win32' && !/[\\/]/.test(command) && !/\.[a-z0-9]+$/i.test(command);
}

function resolveWindowsSpawnInvocation(invocation, options = {}) {
  const platform = options.platform || process.platform;
  const execFileSyncImpl = options.execFileSyncImpl || execFileSync;
  if (!shouldResolveWindowsSpawnCommand(invocation.command, platform)) {
    return invocation;
  }

  try {
    const output = execFileSyncImpl('where.exe', [invocation.command], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 15000
    });
    const candidates = String(output || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const preferredPath = candidates.find((candidate) => /\.(cmd|exe|bat)$/i.test(candidate))
      || candidates[0];
    if (!preferredPath) {
      return invocation;
    }

    if (/\.ps1$/i.test(preferredPath)) {
      return {
        ...invocation,
        command: 'pwsh',
        args: ['-NoProfile', '-File', preferredPath, ...invocation.args]
      };
    }

    if (/\.(cmd|bat)$/i.test(preferredPath)) {
      return {
        ...invocation,
        command: 'cmd.exe',
        args: ['/d', '/s', '/c', preferredPath, ...invocation.args]
      };
    }

    return {
      ...invocation,
      command: preferredPath
    };
  } catch {
    return invocation;
  }
}

function appendLog(logFile, message) {
  if (!logFile) {
    return;
  }
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`, 'utf8');
}

function archiveObservations(observationsFile, projectDir) {
  if (!observationsFile || !projectDir || !fs.existsSync(observationsFile)) {
    return;
  }

  const archiveDir = path.join(projectDir, 'observations.archive');
  fs.mkdirSync(archiveDir, { recursive: true });
  try {
    fs.renameSync(observationsFile, path.join(archiveDir, `processed-${Date.now()}.jsonl`));
  } catch {
    // Best-effort archive move.
  }
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function createObserverRuntime(options = {}) {
  const entrypointDir = path.resolve(options.entrypointDir || process.cwd());
  const skillDir = path.resolve(options.skillDir || path.join(entrypointDir, '..'));
  const configPath = options.configPath
    ? path.resolve(options.configPath)
    : path.join(skillDir, 'config.json');
  const detectProject = options.detectProject;

  if (typeof detectProject !== 'function') {
    throw new Error('createObserverRuntime requires detectProject');
  }

  function buildObserverEnv(env = process.env, overrides = {}) {
    return createContinuousLearningContext({
      entrypointDir,
      skillDir: overrides.skillDir || skillDir,
      configPath,
      env
    }).env;
  }

  function loadObserverConfig(nextConfigPath = configPath) {
    let config = { ...DEFAULT_CONFIG };
    if (!fs.existsSync(nextConfigPath)) {
      return config;
    }

    try {
      const data = JSON.parse(fs.readFileSync(nextConfigPath, 'utf8'));
      config = mergeObserverConfig(config, data.observer || {});
    } catch {
      // Keep defaults when config parsing fails.
    }

    return config;
  }

  function inferObserverTool(config, env = process.env) {
    const resolvedEnv = buildObserverEnv(env);
    if (resolvedEnv.MDT_OBSERVER_TOOL && resolvedEnv.MDT_OBSERVER_TOOL.trim()) {
      return resolvedEnv.MDT_OBSERVER_TOOL.trim().toLowerCase();
    }

    if (config.tool && String(config.tool).trim()) {
      return String(config.tool).trim().toLowerCase();
    }

    const context = createContinuousLearningContext({
      entrypointDir,
      skillDir,
      configPath,
      env: resolvedEnv
    });
    if (context.tool === 'cursor' || context.tool === 'claude') {
      return context.tool;
    }

    return inferToolFromConfigDir(context.configDir);
  }

  function analyzeObservations(runtimeOptions = {}) {
    const spawnImpl = runtimeOptions.spawnImpl || spawn;
    const env = buildObserverEnv(runtimeOptions.env || process.env, { skillDir: runtimeOptions.skillDir });
    const observationsFile = env.CLV2_OBSERVATIONS_FILE;
    const instinctsDir = env.CLV2_INSTINCTS_DIR;
    const minObs = parseInt(env.CLV2_MIN_OBSERVATIONS || '20', 10);
    const logFile = env.CLV2_LOG_FILE;
    const projectName = env.CLV2_PROJECT_NAME || 'global';
    const projectDir = env.CLV2_PROJECT_DIR;
    const config = runtimeOptions.config || loadObserverConfig();
    const tool = inferObserverTool(config, env);

    if (!observationsFile || !fs.existsSync(observationsFile)) {
      return null;
    }

    const lines = fs.readFileSync(observationsFile, 'utf8').split('\n').filter(Boolean);
    if (lines.length < minObs) {
      return null;
    }

    const prompt = buildAnalysisPrompt(projectName, observationsFile, instinctsDir);
    const invocation = buildAnalyzerInvocation({
      tool,
      config,
      prompt,
      workspace: projectDir || process.cwd()
    });
    const resolvedInvocation = resolveWindowsSpawnInvocation(invocation);

    appendLog(
      logFile,
      `Analyzing ${lines.length} observations for project ${projectName} with ${tool}${invocation.model ? ` (${invocation.model})` : ''}...`
    );

    const child = spawnImpl(resolvedInvocation.command, resolvedInvocation.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: projectDir || process.cwd(),
      env
    });

    child.on('close', (code) => {
      if (code !== 0) {
        appendLog(logFile, `${tool} analysis failed (exit ${code})`);
      }
      archiveObservations(observationsFile, projectDir);
    });

    child.on('error', (error) => {
      appendLog(logFile, `${tool} analysis failed to start: ${error.message}`);
    });

    return child;
  }

  function runLoop(loopOptions = {}) {
    const intervalSec = parseInt(process.env.CLV2_INTERVAL_SECONDS || '300', 10);

    function analyze() {
      analyzeObservations(loopOptions);
    }

    setInterval(analyze, intervalSec * 1000);
    setTimeout(analyze, 5000);
  }

  function main(argv = process.argv.slice(2)) {
    const observerEnv = buildObserverEnv(process.env);
    for (const [key, value] of Object.entries(observerEnv)) {
      if (process.env[key] === undefined && value !== undefined) {
        process.env[key] = value;
      }
    }

    const project = detectProject(process.cwd());
    const config = loadObserverConfig();
    const pidFile = path.join(project.project_dir, '.observer.pid');
    const logFile = path.join(project.project_dir, 'observer.log');
    const observationsFile = project.observations_file;
    const instinctsDir = path.join(project.project_dir, 'instincts', 'personal');
    const intervalSeconds = config.run_interval_minutes * 60;
    const minObservations = config.min_observations_to_analyze;
    const cmd = argv[0] || 'start';

    if (cmd === '--loop') {
      runLoop({ config });
      return;
    }

    console.log(`Project: ${project.name} (${project.id})`);
    console.log(`Storage: ${project.project_dir}`);
    console.log(`Observer tool: ${inferObserverTool(config)}`);

    if (cmd === 'stop') {
      if (fs.existsSync(pidFile)) {
        const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
        if (isPidAlive(pid)) {
          console.log(`Stopping observer for ${project.name} (PID: ${pid})...`);
          try {
            process.kill(pid, 'SIGTERM');
          } catch {
            // Process may already be gone.
          }
          fs.unlinkSync(pidFile);
          console.log('Observer stopped.');
        } else {
          console.log('Observer not running (stale PID file).');
          fs.unlinkSync(pidFile);
        }
      } else {
        console.log('Observer not running.');
      }
      process.exit(0);
      return;
    }

    if (cmd === 'status') {
      if (fs.existsSync(pidFile)) {
        const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
        if (isPidAlive(pid)) {
          console.log(`Observer is running (PID: ${pid})`);
          console.log(`Log: ${logFile}`);
          const lineCount = fs.existsSync(observationsFile)
            ? fs.readFileSync(observationsFile, 'utf8').split('\n').filter(Boolean).length
            : 0;
          console.log(`Observations: ${lineCount} lines`);
          const instinctCount = fs.existsSync(instinctsDir)
            ? fs.readdirSync(instinctsDir).filter(f => /\.(yaml|yml|md)$/i.test(f)).length
            : 0;
          console.log(`Instincts: ${instinctCount}`);
          process.exit(0);
        } else {
          console.log('Observer not running (stale PID file)');
          fs.unlinkSync(pidFile);
          process.exit(1);
        }
      } else {
        console.log('Observer not running');
        process.exit(1);
      }
      return;
    }

    if (cmd !== 'start') {
      console.log('Usage: node start-observer.js {start|stop|status}');
      process.exit(1);
    }

    if (!config.enabled) {
      console.log('Observer is disabled in config.json (observer.enabled: false).');
      console.log('Set observer.enabled to true in config.json to enable.');
      process.exit(1);
    }

    if (fs.existsSync(pidFile)) {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
      if (isPidAlive(pid)) {
        console.log(`Observer already running for ${project.name} (PID: ${pid})`);
        process.exit(0);
      }
      fs.unlinkSync(pidFile);
    }

    console.log(`Starting observer agent for ${project.name}...`);

    const child = spawn(process.execPath, [path.join(entrypointDir, 'start-observer.js'), '--loop'], {
      stdio: ['ignore', 'ignore', 'ignore'],
      detached: true,
      cwd: project.root || process.cwd(),
      env: {
        ...observerEnv,
        CLV2_PROJECT_DIR: project.project_dir,
        CLV2_OBSERVATIONS_FILE: observationsFile,
        CLV2_INSTINCTS_DIR: instinctsDir,
        CLV2_MIN_OBSERVATIONS: String(minObservations),
        CLV2_INTERVAL_SECONDS: String(intervalSeconds),
        CLV2_PROJECT_NAME: project.name,
        CLV2_PROJECT_ID: project.id,
        CLV2_LOG_FILE: logFile
      }
    });

    child.unref();

    fs.writeFileSync(pidFile, String(child.pid), 'utf8');
    appendLog(logFile, `Observer started for ${project.name} (PID: ${child.pid})`);

    setTimeout(() => {
      if (isPidAlive(child.pid)) {
        console.log(`Observer started (PID: ${child.pid})`);
        console.log(`Log: ${logFile}`);
      } else {
        console.log(`Failed to start observer (process died, check ${logFile})`);
        try {
          fs.unlinkSync(pidFile);
        } catch {
          // Best-effort stale PID cleanup.
        }
        process.exit(1);
      }
    }, 2000);
  }

  return {
    DEFAULT_CONFIG,
    analyzeObservations,
    buildObserverEnv,
    buildAnalysisPrompt,
    buildAnalyzerInvocation,
    inferInstalledConfigDir,
    inferObserverTool,
    inferToolFromConfigDir,
    loadObserverConfig,
    main,
    mergeObserverConfig,
    resolveWindowsSpawnInvocation,
    shouldResolveWindowsSpawnCommand,
    runLoop
  };
}

module.exports = {
  DEFAULT_CONFIG,
  createObserverRuntime
};
