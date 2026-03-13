#!/usr/bin/env node
/**
 * Enforce Node-only runtime and unambiguous tool-home path notation.
 * Replaces the former validate-windows-parity check; MDT uses JavaScript/Node only.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '../..');

// Flag only hardcoded *home* .claude paths (not detect-env.js, not path.join(projectDir, '.claude'))
const HARDCODED_HOME_CLAUDE = /path\.join\s*\(\s*(?:homeDir|os\.homedir\(\)|process\.env\.HOME)[^)]*['"]\.claude/;
const AMBIGUOUS_WINDOWS_TOOL_HOME_DOTDIR = /[A-Za-z]:[\\/](?:Users|users)[\\/][^\\/:*?"<>|\s`'"]+[\\/]\.(?:claude|cursor|codex)(?:[\\/]|$)/;

function walkRepoFiles(repoRoot, onFile) {
  function walk(dir) {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile()) {
        onFile(fullPath, path.relative(repoRoot, fullPath));
      }
    }
  }

  walk(repoRoot);
}

function isCommentOnly(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

function isExcluded(line) {
  const t = line.trim();
  return isCommentOnly(line) ||
    t.startsWith('console.') ||
    /\.includes\s*\(\s*['"]\.claude/.test(line) ||
    /message\s*\+=/.test(line) ||
    t.startsWith("message +=");
}

function checkNoHardcodedPaths(repoRoot = REPO_ROOT) {
  const errors = [];
  const jsDirs = [
    path.join(repoRoot, 'scripts'),
    path.join(repoRoot, 'skills')
  ];
  const selfRel = path.relative(repoRoot, path.join(__dirname, 'validate-no-hardcoded-paths.js'));
  const detectEnvRel = path.relative(repoRoot, path.join(repoRoot, 'scripts', 'lib', 'detect-env.js'));
  const installMdtRel = path.relative(repoRoot, path.join(repoRoot, 'scripts', 'install-mdt.js'));
  const excluded = new Set([selfRel, detectEnvRel, installMdtRel]);
  for (const dir of jsDirs) {
    if (!fs.existsSync(dir)) continue;
    const walk = (d) => {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(d, e.name);
        const rel = path.relative(repoRoot, full);
        if (e.isDirectory() && e.name !== 'node_modules') walk(full);
        else if (e.isFile() && e.name.endsWith('.js') && !excluded.has(rel)) {
          const content = fs.readFileSync(full, 'utf8');
          const lines = content.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (isCommentOnly(line) || isExcluded(line)) continue;
            if (HARDCODED_HOME_CLAUDE.test(line)) {
              errors.push(`${rel}:${i + 1}: hardcoded home .claude path (use detect-env): ${line.trim().slice(0, 60)}`);
            }
          }
        }
      }
    };
    walk(dir);
  }
  return errors;
}

function checkUnambiguousToolHomePaths(repoRoot = REPO_ROOT) {
  const errors = [];
  const allowedExtensions = new Set(['.js', '.md']);

  walkRepoFiles(repoRoot, (fullPath, relPath) => {
    if (!allowedExtensions.has(path.extname(fullPath))) {
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (!AMBIGUOUS_WINDOWS_TOOL_HOME_DOTDIR.test(line)) {
        continue;
      }

      errors.push(
        `${relPath}:${index + 1}: ambiguous expanded Windows tool-home path; use ~/.{tool}/... in prose or Join-Path $HOME '.tool' in PowerShell examples`
      );
    }
  });

  return errors;
}

function checkNoShellScriptsInRepo(repoRoot = REPO_ROOT) {
  const errors = [];
  const dirsToWalk = [repoRoot, path.join(repoRoot, 'scripts')];
  const seen = new Set();
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === 'node_modules') continue;
      const full = path.join(dir, e.name);
      const rel = path.relative(repoRoot, full);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && (e.name.endsWith('.sh') || e.name.endsWith('.ps1'))) {
        if (!seen.has(rel)) {
          seen.add(rel);
          errors.push(rel + ': MDT is Node-only; remove .sh/.ps1 scripts');
        }
      }
    }
  }
  dirsToWalk.forEach(walk);
  return errors;
}

function validateNoHardcodedPaths(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const io = options.io || { log: console.log, error: console.error };
  const noShell = checkNoShellScriptsInRepo(repoRoot);
  const hardcoded = checkNoHardcodedPaths(repoRoot);
  const ambiguousToolHomes = checkUnambiguousToolHomePaths(repoRoot);
  const all = [...noShell, ...hardcoded, ...ambiguousToolHomes];
  if (all.length > 0) {
    all.forEach(e => io.error(e));
    return { exitCode: 1, errors: all };
  }
  io.log('Validated Node-only runtime and unambiguous tool-home path notation');
  return { exitCode: 0, errors: [] };
}

if (require.main === module) {
  const result = validateNoHardcodedPaths();
  process.exit(result.exitCode);
}

module.exports = {
  AMBIGUOUS_WINDOWS_TOOL_HOME_DOTDIR,
  checkNoHardcodedPaths,
  checkNoShellScriptsInRepo,
  checkUnambiguousToolHomePaths,
  validateNoHardcodedPaths
};
