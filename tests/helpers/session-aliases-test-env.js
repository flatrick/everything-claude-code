const path = require('path');
const fs = require('fs');
const os = require('os');

function setupSessionAliasesTestEnv() {
  // Mock config home before requiring module so it binds to isolated temp storage.
  const tmpHome = path.join(os.tmpdir(), `ecc-alias-test-${Date.now()}`);
  fs.mkdirSync(path.join(tmpHome, '.claude'), { recursive: true });
  process.env.HOME = tmpHome;
  process.env.USERPROFILE = tmpHome; // Windows: os.homedir() uses USERPROFILE

  const aliases = require('../../scripts/lib/session-aliases');

  function resetAliases() {
    const aliasesPath = aliases.getAliasesPath();
    try {
      if (fs.existsSync(aliasesPath)) {
        fs.unlinkSync(aliasesPath);
      }
    } catch {
      // ignore
    }
  }

  return { aliases, resetAliases };
}

module.exports = {
  setupSessionAliasesTestEnv
};
