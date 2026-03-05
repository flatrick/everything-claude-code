# Migration: Reset and reinstall ECC (Node-only)

After the ECC Node-only migration, skills and hooks run only via Node.js. Use this guide to reset and reinstall from the repo.

## Current status

- **Done:** Installer and runtime are **Node-only**. `node scripts/install-ecc.js` installs to Claude Code, Cursor, or Codex. No PowerShell or Bash scripts remain; skills and hooks run via Node.js. CI guard (`validate-no-hardcoded-paths.js`) enforces no `.sh`/`.ps1` in the repo.

## Steps

1. **Back up** (optional) your existing configs:
   - `~/.claude` (Claude Code)
   - `~/.cursor` (Cursor)
   - `~/.codex` (Codex)

2. **Remove or archive** old skill/hook directories where `.sh`/`.ps1` scripts might still be referenced, if you want a clean state.

3. **Re-run the installer** from the ECC repo (Node only):
   ```bash
   cd /path/to/everything-claude-code
   node scripts/install-ecc.js typescript
   ```
   For Cursor (project or global):
   ```bash
   node scripts/install-ecc.js --target cursor typescript
   node scripts/install-ecc.js --target cursor --global typescript
   ```
   For Codex only:
   ```bash
   node scripts/install-ecc.js --target codex
   ```

4. **Verify** (optional): run a quick smoke check that env detection works:
   ```bash
   node -e "const d=require('./scripts/lib/detect-env.js').detectEnv(); console.log('tool:', d.tool, 'configDir:', d.getConfigDir(), 'dataDir:', d.getDataDir());"
   ```

Hooks installed from the repo now use `node "…/script.js"` (and `node -e "…"` for inline hooks). No Bash or PowerShell scripts are invoked by ECC skills or hooks.
