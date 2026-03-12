'use strict';

const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const {
  cleanupStaleManagedProcessState,
  evaluateManagedProcessLease,
  readManagedProcessState,
  stopManagedProcess,
  writeManagedProcessState
} = require('../detached-process-lifecycle');
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

function buildClaudeAnalyzerInvocation(command, model, prompt) {
  const args = ['--print', '--max-turns', '3'];
  if (model) {
    args.push('--model', model);
  }
  args.push(prompt);
  return { command: command || 'claude', args, model };
}

function buildCursorAnalyzerInvocation(command, model, prompt, workspace) {
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

function buildCodexAnalyzerInvocation(command, model, prompt, workspace) {
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
    return buildClaudeAnalyzerInvocation(command, model, prompt);
  }

  if (tool === 'cursor') {
    return buildCursorAnalyzerInvocation(command, model, prompt, workspace);
  }

  if (tool === 'codex') {
    return buildCodexAnalyzerInvocation(command, model, prompt, workspace);
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

function createObserverConfigLoader(configPath) {
  return function loadObserverConfig(nextConfigPath = configPath) {
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
  };
}

function resolveObserverStateFile(project) {
  return path.join(project.project_dir, '.observer.pid');
}

function readObserverState(stateFile) {
  return readManagedProcessState(stateFile);
}

function cleanupObserverStateIfStale(stateFile, runtimeOptions = {}) {
  return cleanupStaleManagedProcessState(stateFile, {
    isPidAliveImpl: runtimeOptions.isPidAliveImpl || isPidAlive
  });
}

function stopObserverProcess(stateFile, runtimeOptions = {}) {
  return stopManagedProcess(stateFile, {
    isPidAliveImpl: runtimeOptions.isPidAliveImpl || isPidAlive,
    killImpl: runtimeOptions.killImpl || process.kill
  });
}

function createBuildObserverEnv(entrypointDir, skillDir, configPath) {
  return function buildObserverEnv(env = process.env, overrides = {}) {
    return createContinuousLearningContext({
      entrypointDir,
      skillDir: overrides.skillDir || skillDir,
      configPath,
      env
    }).env;
  };
}

function getLoopLeaseStatus(loopOptions = {}, loadObserverConfig, configPath) {
  const env = loopOptions.env || process.env;
  const stateFile = env.MDT_HELPER_STATE_FILE;
  const instanceId = env.MDT_HELPER_INSTANCE_ID;
  const startupGraceUntil = parseInt(String(env.MDT_HELPER_LEASE_GRACE_UNTIL || '0'), 10);
  const pid = typeof loopOptions.currentPid === 'number' ? loopOptions.currentPid : process.pid;

  if (stateFile) {
    const leaseStatus = evaluateManagedProcessLease({
      stateFilePath: stateFile,
      pid,
      instanceId
    });

    if (leaseStatus.shouldExit && leaseStatus.reason === 'lease-missing' && Date.now() < startupGraceUntil) {
      return { shouldExit: false, reason: null };
    }
    if (leaseStatus.shouldExit) {
      return leaseStatus;
    }
  }

  const config = (loopOptions.loadConfigImpl || loadObserverConfig)(configPath);
  if (!config.enabled) {
    return { shouldExit: true, reason: 'observer-disabled', state: null };
  }

  return { shouldExit: false, reason: null, state: null };
}

function inferObserverTool(config, env, buildObserverEnv, entrypointDir, skillDir, configPath) {
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

function countObservationLines(observationsFile) {
  return fs.readFileSync(observationsFile, 'utf8').split('\n').filter(Boolean);
}

function getAnalysisContext(buildObserverEnv, runtimeOptions, loadObserverConfig, inferObserverToolImpl) {
  const env = buildObserverEnv(runtimeOptions.env || process.env, { skillDir: runtimeOptions.skillDir });
  const observationsFile = env.CLV2_OBSERVATIONS_FILE;
  const config = runtimeOptions.config || loadObserverConfig();
  return {
    env,
    observationsFile,
    instinctsDir: env.CLV2_INSTINCTS_DIR,
    minObs: parseInt(env.CLV2_MIN_OBSERVATIONS || '20', 10),
    logFile: env.CLV2_LOG_FILE,
    projectName: env.CLV2_PROJECT_NAME || 'global',
    projectDir: env.CLV2_PROJECT_DIR,
    config,
    tool: inferObserverToolImpl(config, env)
  };
}

function spawnAnalysisChild(spawnImpl, invocation, projectDir, env) {
  const resolvedInvocation = resolveWindowsSpawnInvocation(invocation);
  return spawnImpl(resolvedInvocation.command, resolvedInvocation.args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: projectDir || process.cwd(),
    env
  });
}

function createAnalyzeObservations(options) {
  const {
    buildObserverEnv,
    inferObserverToolImpl,
    loadObserverConfig
  } = options;

  return function analyzeObservations(runtimeOptions = {}) {
    const spawnImpl = runtimeOptions.spawnImpl || spawn;
    const analysis = getAnalysisContext(buildObserverEnv, runtimeOptions, loadObserverConfig, inferObserverToolImpl);

    if (!analysis.observationsFile || !fs.existsSync(analysis.observationsFile)) {
      return null;
    }

    const lines = countObservationLines(analysis.observationsFile);
    if (lines.length < analysis.minObs) {
      return null;
    }

    const prompt = buildAnalysisPrompt(analysis.projectName, analysis.observationsFile, analysis.instinctsDir);
    const invocation = buildAnalyzerInvocation({
      tool: analysis.tool,
      config: analysis.config,
      prompt,
      workspace: analysis.projectDir || process.cwd()
    });
    appendLog(analysis.logFile, `Analyzing ${lines.length} observations for project ${analysis.projectName} with ${analysis.tool}${invocation.model ? ` (${invocation.model})` : ''}...`);
    const child = spawnAnalysisChild(spawnImpl, invocation, analysis.projectDir, analysis.env);

    child.on('close', (code) => {
      if (code !== 0) {
        appendLog(analysis.logFile, `${analysis.tool} analysis failed (exit ${code})`);
      }
      archiveObservations(analysis.observationsFile, analysis.projectDir);
    });

    child.on('error', (error) => {
      appendLog(analysis.logFile, `${analysis.tool} analysis failed to start: ${error.message}`);
    });

    return child;
  };
}

function createRunLoop(loadObserverConfig, configPath, analyzeObservations) {
  return function runLoop(loopOptions = {}) {
    const env = loopOptions.env || process.env;
    const intervalSec = parseInt(env.CLV2_INTERVAL_SECONDS || '300', 10);
    const validateIntervalMs = parseInt(String(loopOptions.validateIntervalMs || Math.min(intervalSec * 1000, 5000)), 10);
    const setIntervalImpl = loopOptions.setIntervalImpl || setInterval;
    const clearIntervalImpl = loopOptions.clearIntervalImpl || clearInterval;
    const setTimeoutImpl = loopOptions.setTimeoutImpl || setTimeout;
    const clearTimeoutImpl = loopOptions.clearTimeoutImpl || clearTimeout;
    const exitImpl = loopOptions.exitImpl || process.exit;
    const logFile = env.CLV2_LOG_FILE;
    let analysisTimer = null;
    let validationTimer = null;
    let startupTimer = null;
    let stopped = false;

    function stopLoop(reason) {
      if (stopped) {
        return;
      }
      stopped = true;
      if (analysisTimer) clearIntervalImpl(analysisTimer);
      if (validationTimer) clearIntervalImpl(validationTimer);
      if (startupTimer) clearTimeoutImpl(startupTimer);
      if (reason) {
        appendLog(logFile, `Observer loop exiting: ${reason}`);
      }
      exitImpl(0);
    }

    function validateLease() {
      const status = getLoopLeaseStatus(loopOptions, loadObserverConfig, configPath);
      if (status.shouldExit) {
        stopLoop(status.reason);
        return false;
      }
      return true;
    }

    function analyze() {
      if (!validateLease()) {
        return;
      }
      const analyzeImpl = loopOptions.analyzeObservations || analyzeObservations;
      analyzeImpl({
        ...loopOptions,
        env,
        config: (loopOptions.loadConfigImpl || loadObserverConfig)(configPath)
      });
    }

    validationTimer = setIntervalImpl(validateLease, validateIntervalMs);
    analysisTimer = setIntervalImpl(analyze, intervalSec * 1000);
    startupTimer = setTimeoutImpl(analyze, 5000);
    return { stopLoop, validateLease };
  };
}

function buildObserverRuntimeDeps(options = {}) {
  const entrypointDir = path.resolve(options.entrypointDir || process.cwd());
  const skillDir = path.resolve(options.skillDir || path.join(entrypointDir, '..'));
  const configPath = options.configPath ? path.resolve(options.configPath) : path.join(skillDir, 'config.json');
  return { entrypointDir, skillDir, configPath, detectProject: options.detectProject };
}

function createObserverMain(deps) {
  const {
    entrypointDir,
    detectProject,
    buildObserverEnv,
    loadObserverConfig,
    inferObserverToolImpl,
    runLoop
  } = deps;

  return function main(argv = process.argv.slice(2), runtimeOptions = {}) {
    const env = runtimeOptions.env || process.env;
    const observerEnv = buildObserverEnv(env);
    const log = runtimeOptions.logImpl || console.log;
    const exitImpl = runtimeOptions.exitImpl || process.exit;
    const spawnImpl = runtimeOptions.spawnImpl || spawn;
    const isPidAliveImpl = runtimeOptions.isPidAliveImpl || isPidAlive;
    const setTimeoutImpl = runtimeOptions.setTimeoutImpl || setTimeout;
    seedProcessEnv(observerEnv);
    const context = buildObserverCommandContext(detectProject, loadObserverConfig, inferObserverToolImpl, log);
    context.runtimeOptions = runtimeOptions;
    context.exitImpl = exitImpl;
    context.isPidAliveImpl = isPidAliveImpl;
    context.spawnImpl = spawnImpl;
    context.setTimeoutImpl = setTimeoutImpl;
    context.entrypointDir = entrypointDir;
    context.observerEnv = observerEnv;
    runObserverCommand(argv[0], context, observerEnv, loadObserverConfig, runLoop);
  };
}

function runObserverCommand(cmd, context, observerEnv, loadObserverConfig, runLoop) {
  if (handleLoopCommand(cmd, observerEnv, loadObserverConfig, runLoop)) return;
  if (handleStopCommand(cmd, context)) return;
  if (handleStatusCommand(cmd, context)) return;
  if (handleInvalidCommand(cmd, context.log, context.exitImpl)) return;
  if (handleDisabledObserver(context)) return;
  startObserverProcess(context);
}

function seedProcessEnv(observerEnv) {
  for (const [key, value] of Object.entries(observerEnv)) {
    if (process.env[key] === undefined && value !== undefined) {
      process.env[key] = value;
    }
  }
}

function buildObserverCommandContext(detectProject, loadObserverConfig, inferObserverToolImpl, log) {
  const project = detectProject(process.cwd());
  const config = loadObserverConfig();
  const pidFile = resolveObserverStateFile(project);
  const logFile = path.join(project.project_dir, 'observer.log');
  log(`Project: ${project.name} (${project.id})`);
  log(`Storage: ${project.project_dir}`);
  log(`Observer tool: ${inferObserverToolImpl(config)}`);

  return {
    project,
    config,
    pidFile,
    logFile,
    observationsFile: project.observations_file,
    instinctsDir: path.join(project.project_dir, 'instincts', 'personal'),
    intervalSeconds: config.run_interval_minutes * 60,
    minObservations: config.min_observations_to_analyze,
    log
  };
}

function handleLoopCommand(cmd, observerEnv, loadObserverConfig, runLoop) {
  if (cmd !== '--loop') {
    return false;
  }
  runLoop({ env: observerEnv, loadConfigImpl: loadObserverConfig });
  return true;
}

function handleStopCommand(cmd, context) {
  if (cmd !== 'stop') {
    return false;
  }
  const stopResult = stopObserverProcess(context.pidFile, context.runtimeOptions);
  if (stopResult.state && stopResult.reason === 'signaled') {
    context.log(`Stopping observer for ${context.project.name} (PID: ${stopResult.state.pid})...`);
    context.log('Observer stopped and lease removed.');
  } else if (stopResult.state && stopResult.reason === 'stale') {
    context.log(`Observer not running (stale lease removed for PID: ${stopResult.state.pid}).`);
  } else {
    context.log('Observer not running.');
  }
  context.exitImpl(0);
  return true;
}

function handleStatusCommand(cmd, context) {
  if (cmd !== 'status') {
    return false;
  }
  const state = readObserverState(context.pidFile);
  if (!state) {
    context.log('Observer not running');
    context.exitImpl(1);
    return true;
  }
  if (!context.isPidAliveImpl(state.pid)) {
    cleanupObserverStateIfStale(context.pidFile, context.runtimeOptions);
    context.log(`Observer not running (stale lease removed for PID: ${state.pid})`);
    context.exitImpl(1);
    return true;
  }

  context.log(`Observer is running (PID: ${state.pid})`);
  context.log(`Lease: ${context.pidFile}`);
  context.log(`Log: ${context.logFile}`);
  const lineCount = fs.existsSync(context.observationsFile) ? countObservationLines(context.observationsFile).length : 0;
  const instinctCount = fs.existsSync(context.instinctsDir)
    ? fs.readdirSync(context.instinctsDir).filter((f) => /\.(yaml|yml|md)$/i.test(f)).length
    : 0;
  context.log(`Observations: ${lineCount} lines`);
  context.log(`Instincts: ${instinctCount}`);
  context.exitImpl(0);
  return true;
}

function handleInvalidCommand(cmd, log, exitImpl) {
  if (!cmd || cmd === 'start') {
    return false;
  }
  log('Usage: node start-observer.js {start|stop|status}');
  exitImpl(1);
  return true;
}

function handleDisabledObserver(context) {
  if (context.config.enabled) {
    return false;
  }
  context.log('Observer is disabled in config.json (observer.enabled: false).');
  context.log('Set observer.enabled to true in config.json to enable.');
  context.exitImpl(1);
  return true;
}

function buildObserverChildEnv(context, instanceId) {
  return {
    ...context.observerEnv,
    CLV2_PROJECT_DIR: context.project.project_dir,
    CLV2_OBSERVATIONS_FILE: context.observationsFile,
    CLV2_INSTINCTS_DIR: context.instinctsDir,
    CLV2_MIN_OBSERVATIONS: String(context.minObservations),
    CLV2_INTERVAL_SECONDS: String(context.intervalSeconds),
    CLV2_PROJECT_NAME: context.project.name,
    CLV2_PROJECT_ID: context.project.id,
    CLV2_LOG_FILE: context.logFile,
    MDT_HELPER_STATE_FILE: context.pidFile,
    MDT_HELPER_INSTANCE_ID: instanceId,
    MDT_HELPER_LEASE_GRACE_UNTIL: String(Date.now() + 10000)
  };
}

function finalizeObserverStart(context, child, instanceId, entrypoint) {
  child.unref();
  writeManagedProcessState(context.pidFile, {
    pid: child.pid,
    instanceId,
    cwd: context.project.root || process.cwd(),
    entrypoint
  });
  appendLog(context.logFile, `Observer started for ${context.project.name} (PID: ${child.pid}, instance: ${instanceId})`);
}

function scheduleObserverStartupCheck(context, child, instanceId) {
  context.setTimeoutImpl(() => {
    if (context.isPidAliveImpl(child.pid)) {
      context.log(`Observer started (PID: ${child.pid})`);
      context.log(`Lease: ${context.pidFile}`);
      context.log(`Log: ${context.logFile}`);
      return;
    }
    const leaseStatus = evaluateManagedProcessLease({
      stateFilePath: context.pidFile,
      pid: child.pid,
      instanceId
    });
    context.log(`Failed to start observer (process died, check ${context.logFile})`);
    if (!leaseStatus.shouldExit) {
      stopObserverProcess(context.pidFile, context.runtimeOptions);
    }
    try {
      cleanupObserverStateIfStale(context.pidFile, context.runtimeOptions);
    } catch {
      // Best-effort stale lease cleanup.
    }
    context.exitImpl(1);
  }, 2000);
}

function startObserverProcess(context) {
  const existingState = readObserverState(context.pidFile);
  if (existingState) {
    if (context.isPidAliveImpl(existingState.pid)) {
      context.log(`Observer already running for ${context.project.name} (PID: ${existingState.pid})`);
      context.exitImpl(0);
      return;
    }
    cleanupObserverStateIfStale(context.pidFile, context.runtimeOptions);
  }

  context.log(`Starting observer agent for ${context.project.name}...`);
  const instanceId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const entrypoint = path.join(context.entrypointDir, 'start-observer.js');
  const child = context.spawnImpl(process.execPath, [entrypoint, '--loop'], {
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: true,
    cwd: context.project.root || process.cwd(),
    env: buildObserverChildEnv(context, instanceId)
  });

  finalizeObserverStart(context, child, instanceId, entrypoint);
  scheduleObserverStartupCheck(context, child, instanceId);
}

function createObserverRuntime(options = {}) {
  const { entrypointDir, skillDir, configPath, detectProject } = buildObserverRuntimeDeps(options);

  if (typeof detectProject !== 'function') {
    throw new Error('createObserverRuntime requires detectProject');
  }
  const buildObserverEnv = createBuildObserverEnv(entrypointDir, skillDir, configPath);
  const loadObserverConfig = createObserverConfigLoader(configPath);
  const inferObserverToolImpl = (config, env = process.env) => (
    inferObserverTool(config, env, buildObserverEnv, entrypointDir, skillDir, configPath)
  );
  const analyzeObservations = createAnalyzeObservations({
    buildObserverEnv,
    inferObserverToolImpl,
    loadObserverConfig
  });
  const runLoop = createRunLoop(loadObserverConfig, configPath, analyzeObservations);
  const main = createObserverMain({
    entrypointDir,
    detectProject,
    buildObserverEnv,
    loadObserverConfig,
    inferObserverToolImpl,
    runLoop
  });

  return {
    DEFAULT_CONFIG,
    analyzeObservations,
    buildObserverEnv,
    buildAnalysisPrompt,
    buildAnalyzerInvocation,
    inferInstalledConfigDir,
    inferObserverTool: inferObserverToolImpl,
    inferToolFromConfigDir,
    getLoopLeaseStatus: (loopOptions = {}) => getLoopLeaseStatus(loopOptions, loadObserverConfig, configPath),
    loadObserverConfig,
    main,
    mergeObserverConfig,
    readObserverState,
    resolveWindowsSpawnInvocation,
    resolveObserverStateFile,
    shouldResolveWindowsSpawnCommand,
    stopObserverProcess,
    runLoop
  };
}

module.exports = {
  DEFAULT_CONFIG,
  createObserverRuntime
};
