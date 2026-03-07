const path = require('path');
const { spawn } = require('child_process');
const { withEnv } = require('./env-test-utils');
const { buildTestEnv, NEUTRAL_TOOL_ENV, TOOL_DETECTION_KEYS } = require('./test-env-profiles');

const defaultProfile = () => process.env.MDT_TEST_ENV_PROFILE || 'neutral';

function runScript(scriptPath, input = '', env = {}, profile) {
  const hasToolOverride = TOOL_DETECTION_KEYS.some((k) => k in env);
  const effectiveProfile = profile !== undefined
    ? profile
    : hasToolOverride
      ? 'neutral'
      : defaultProfile();
  return new Promise((resolve, reject) => {
    const merged = buildTestEnv(effectiveProfile, env);
    const proc = spawn('node', [scriptPath], {
      env: merged,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', data => stdout += data);
    proc.stderr.on('data', data => stderr += data);

    if (input) {
      proc.stdin.write(input);
    }
    proc.stdin.end();

    proc.on('close', code => {
      resolve({ code, stdout, stderr });
    });

    proc.on('error', reject);
  });
}

// Return the sessions dir that hook scripts use when run with HOME=homeDir
// (tool-agnostic: .cursor, .claude, or .codex). When envOverrides contains any
// tool-detection key we use neutral + overrides (test's intent wins). Otherwise
// we use the runner's profile so we match runScript() when the test passes no tool vars.
function getSessionsDirForHome(homeDir, envOverrides = {}) {
  let dir;
  const detectEnvPath = path.resolve(__dirname, '..', '..', 'scripts', 'lib', 'detect-env.js');
  const utilsPath = path.resolve(__dirname, '..', '..', 'scripts', 'lib', 'utils.js');

  const hasToolOverride = TOOL_DETECTION_KEYS.some((k) => k in envOverrides);
  const profile = hasToolOverride ? 'neutral' : defaultProfile();
  const envForScript = buildTestEnv(profile, {
    HOME: homeDir,
    USERPROFILE: homeDir,
    ...envOverrides
  });
  const fullEnv = { ...NEUTRAL_TOOL_ENV, ...envForScript };

  withEnv(fullEnv, () => {
    delete require.cache[detectEnvPath];
    delete require.cache[utilsPath];
    const utils = require(utilsPath);
    dir = utils.getSessionsDir();
  });

  delete require.cache[detectEnvPath];
  delete require.cache[utilsPath];
  return dir;
}

module.exports = {
  runScript,
  getSessionsDirForHome
};
