#!/usr/bin/env node
/**
 * Continuous Learning v2 - Observer Agent Launcher
 *
 * Starts a background observer that analyzes observations and creates instincts.
 * Uses Haiku model for cost efficiency.
 *
 * v2.1: Project-scoped — detects current project and analyzes project-specific observations.
 *
 * Usage:
 *   node start-observer.js           # Start observer for current project (or global)
 *   node start-observer.js stop      # Stop running observer
 *   node start-observer.js status    # Check if observer is running
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const skillRoot = path.join(__dirname, '..');
const { detectProject, homunculusDir } = require(path.join(skillRoot, 'scripts', 'detect-project.js'));

const project = detectProject(process.cwd());
const configFile = path.join(skillRoot, 'config.json');
const pidFile = path.join(project.project_dir, '.observer.pid');
const logFile = path.join(project.project_dir, 'observer.log');
const observationsFile = project.observations_file;
const instinctsDir = path.join(project.project_dir, 'instincts', 'personal');

let config = {
  run_interval_minutes: 5,
  min_observations_to_analyze: 20,
  enabled: false
};
if (fs.existsSync(configFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    const obs = data.observer || {};
    config.run_interval_minutes = obs.run_interval_minutes ?? 5;
    config.min_observations_to_analyze = obs.min_observations_to_analyze ?? 20;
    config.enabled = obs.enabled === true;
  } catch (_) {}
}

const intervalSeconds = config.run_interval_minutes * 60;
const minObservations = config.min_observations_to_analyze;

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function runAnalyze() {
  if (!fs.existsSync(observationsFile)) return;
  const lines = fs.readFileSync(observationsFile, 'utf8').split('\n').filter(Boolean);
  if (lines.length < minObservations) return;

  const logLine = `[${new Date().toISOString()}] Analyzing ${lines.length} observations for project ${project.name}...\n`;
  fs.appendFileSync(logFile, logLine, 'utf8');

  const prompt = `Read ${observationsFile} and identify patterns for the project '${project.name}' (user corrections, error resolutions, repeated workflows, tool preferences).
If you find 3+ occurrences of the same pattern, create an instinct file in ${instinctsDir}/<id>.md.

CRITICAL: Every instinct file MUST use this exact format:

---
id: kebab-case-name
trigger: "when <specific condition>"
confidence: <0.3-0.85 based on frequency: 3-5 times=0.5, 6-10=0.7, 11+=0.85>
domain: <one of: code-style, testing, git, debugging, workflow, file-patterns>
source: session-observation
scope: project
project_id: ${project.id}
project_name: ${project.name}
---

# Title

## Action
<what to do, one clear sentence>

## Evidence
- Observed N times in session <id>
- Pattern: <description>
- Last observed: <date>

Rules:
- Be conservative, only clear patterns with 3+ observations
- Use narrow, specific triggers
- Never include actual code snippets, only describe patterns
- If a similar instinct already exists in ${instinctsDir}/, update it instead of creating a duplicate
- The YAML frontmatter (between --- markers) with id field is MANDATORY
- If a pattern seems universal (not project-specific), set scope to 'global' instead of 'project'`;

  const child = spawn('claude', ['--model', 'haiku', '--max-turns', '3', '--print', prompt], {
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: true,
    cwd: project.root || process.cwd()
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('close', (code) => {
    if (code !== 0) {
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] Claude analysis failed (exit ${code})\n`, 'utf8');
    }
    const archiveDir = path.join(project.project_dir, 'observations.archive');
    if (fs.existsSync(observationsFile)) {
      fs.mkdirSync(archiveDir, { recursive: true });
      const archiveName = `processed-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}.jsonl`;
      try {
        fs.renameSync(observationsFile, path.join(archiveDir, archiveName));
      } catch (_) {}
    }
  });
}

function runLoop() {
  const observationsFile = process.env.CLV2_OBSERVATIONS_FILE;
  const instinctsDir = process.env.CLV2_INSTINCTS_DIR;
  const minObs = parseInt(process.env.CLV2_MIN_OBSERVATIONS || '20', 10);
  const intervalSec = parseInt(process.env.CLV2_INTERVAL_SECONDS || '300', 10);
  const logFile = process.env.CLV2_LOG_FILE;
  const projectName = process.env.CLV2_PROJECT_NAME || 'global';
  const projectDir = process.env.CLV2_PROJECT_DIR;

  function analyze() {
    if (!observationsFile || !fs.existsSync(observationsFile)) return;
    const lines = fs.readFileSync(observationsFile, 'utf8').split('\n').filter(Boolean);
    if (lines.length < minObs) return;

    if (logFile) {
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] Analyzing ${lines.length} observations for project ${projectName}...\n`, 'utf8');
    }

    const prompt = `Read ${observationsFile} and identify patterns for the project '${projectName}'. If you find 3+ occurrences of the same pattern, create an instinct file in ${instinctsDir}/<id>.md. Use YAML frontmatter with id, trigger, confidence, domain, source, scope.`;
    const child = spawn('claude', ['--model', 'haiku', '--max-turns', '3', '--print', prompt], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: projectDir || process.cwd()
    });
    child.on('close', (code) => {
      if (logFile && code !== 0) {
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] Claude analysis failed (exit ${code})\n`, 'utf8');
      }
      if (observationsFile && fs.existsSync(observationsFile)) {
        const archiveDir = path.join(projectDir, 'observations.archive');
        fs.mkdirSync(archiveDir, { recursive: true });
        try {
          fs.renameSync(observationsFile, path.join(archiveDir, `processed-${Date.now()}.jsonl`));
        } catch (_) {}
      }
    });
  }

  setInterval(analyze, intervalSec * 1000);
  setTimeout(analyze, 5000);
}

function main() {
  const cmd = process.argv[2] || 'start';

  if (cmd === '--loop') {
    runLoop();
    return;
  }

  console.log(`Project: ${project.name} (${project.id})`);
  console.log(`Storage: ${project.project_dir}`);

  if (cmd === 'stop') {
    if (fs.existsSync(pidFile)) {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
      if (isPidAlive(pid)) {
        console.log(`Stopping observer for ${project.name} (PID: ${pid})...`);
        try { process.kill(pid, 'SIGTERM'); } catch (_) {}
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

  const child = spawn(process.execPath, [path.join(__dirname, 'start-observer.js'), '--loop'], {
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: true,
    cwd: project.root || process.cwd(),
    env: {
      ...process.env,
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
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] Observer started for ${project.name} (PID: ${child.pid})\n`, 'utf8');

  setTimeout(() => {
    if (isPidAlive(child.pid)) {
      console.log(`Observer started (PID: ${child.pid})`);
      console.log(`Log: ${logFile}`);
    } else {
      console.log(`Failed to start observer (process died, check ${logFile})`);
      try { fs.unlinkSync(pidFile); } catch (_) {}
      process.exit(1);
    }
  }, 2000);
}

main();
