const path = require('path');
const { spawn } = require('child_process');

function runScript(scriptPath, input = '', env = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [scriptPath], {
      env: { ...process.env, ...env },
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
// (tool-agnostic: .cursor, .claude, or .codex).
function getSessionsDirForHome(homeDir, envOverrides = {}) {
  const origHome = process.env.HOME;
  const origProfile = process.env.USERPROFILE;
  const previousEnv = {};
  process.env.HOME = homeDir;
  process.env.USERPROFILE = homeDir;
  for (const [key, value] of Object.entries(envOverrides)) {
    previousEnv[key] = process.env[key];
    if (value === undefined || value === null) {
      delete process.env[key];
    } else {
      process.env[key] = String(value);
    }
  }
  const detectEnvPath = path.resolve(__dirname, '..', '..', 'scripts', 'lib', 'detect-env.js');
  const utilsPath = path.resolve(__dirname, '..', '..', 'scripts', 'lib', 'utils.js');
  delete require.cache[detectEnvPath];
  delete require.cache[utilsPath];
  const utils = require(utilsPath);
  const dir = utils.getSessionsDir();
  process.env.HOME = origHome;
  process.env.USERPROFILE = origProfile;
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  delete require.cache[detectEnvPath];
  delete require.cache[utilsPath];
  return dir;
}

module.exports = {
  runScript,
  getSessionsDirForHome
};
