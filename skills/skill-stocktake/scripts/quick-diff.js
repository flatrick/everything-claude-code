#!/usr/bin/env node
/**
 * quick-diff.js — Compare skill file mtimes against results.json evaluated_at.
 *
 * Usage: node quick-diff.js RESULTS_JSON [CWD_SKILLS_DIR]
 * Output: JSON array of changed/new files to stdout ([] if no changes)
 *
 * Environment:
 *   SKILL_STOCKTAKE_GLOBAL_DIR   Override config dir skills (for testing)
 *   SKILL_STOCKTAKE_PROJECT_DIR  Override project dir (for testing)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function getScriptRoot() {
  const skillDir = __dirname;
  return path.join(skillDir, '..', '..', '..');
}

function loadDetectEnv() {
  const root = getScriptRoot();
  try {
    return require(path.join(root, 'scripts', 'lib', 'detect-env.js')).detectEnv;
  } catch {
    return require(path.join(__dirname, '..', '..', '..', 'scripts', 'lib', 'detect-env.js')).detectEnv;
  }
}

function loadUtils() {
  const root = getScriptRoot();
  try {
    return require(path.join(root, 'scripts', 'lib', 'utils.js'));
  } catch {
    return require(path.join(__dirname, '..', '..', '..', 'scripts', 'lib', 'utils.js'));
  }
}

const detectEnv = loadDetectEnv();
const { findFiles } = loadUtils();

const resultsJson = process.argv[2];
const CWD_SKILLS_DIR = process.env.SKILL_STOCKTAKE_PROJECT_DIR || process.argv[3] || path.join(process.cwd(), '.cursor', 'skills');
const GLOBAL_DIR = process.env.SKILL_STOCKTAKE_GLOBAL_DIR || path.join(detectEnv.getConfigDir(), 'skills');
const homeDir = os.homedir();

function main() {
  if (!resultsJson || !fs.existsSync(resultsJson)) {
    console.error(`Error: RESULTS_JSON not found: ${resultsJson || '<empty>'}`);
    process.exit(1);
  }

  if (CWD_SKILLS_DIR && fs.existsSync(CWD_SKILLS_DIR)) {
    const normalized = CWD_SKILLS_DIR.replace(/\\/g, '/');
    if (!normalized.includes('.claude/skills') && !normalized.includes('.cursor/skills')) {
      console.error(`Warning: CWD_SKILLS_DIR does not look like a .claude/skills or .cursor/skills path: ${CWD_SKILLS_DIR}`);
    }
  }

  const resultsData = JSON.parse(fs.readFileSync(resultsJson, 'utf8'));
  const evaluatedAt = resultsData.evaluated_at;

  const isoRe = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/;
  if (!evaluatedAt || !isoRe.test(evaluatedAt)) {
    console.error(`Error: invalid or missing evaluated_at in ${resultsJson}: ${evaluatedAt}`);
    process.exit(1);
  }

  const knownPaths = new Set();
  if (resultsData.skills && typeof resultsData.skills === 'object') {
    if (Array.isArray(resultsData.skills)) {
      for (const s of resultsData.skills) {
        if (s && s.path) knownPaths.add(s.path);
      }
    } else {
      for (const key of Object.keys(resultsData.skills)) {
        knownPaths.add(key);
      }
    }
  }

  const output = [];

  function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const mdFiles = findFiles(dir, '*.md', { recursive: true })
      .map(f => f.path)
      .filter(p => p.endsWith('.md'))
      .sort();

    for (const file of mdFiles) {
      const stat = fs.statSync(file);
      const mtime = new Date(stat.mtime).toISOString().replace(/\.\d{3}Z$/, 'Z');
      const displayPath = file.startsWith(homeDir) ? '~' + file.slice(homeDir.length).replace(/\\/g, '/') : file.replace(/\\/g, '/');

      const isNew = !knownPaths.has(displayPath);
      if (isNew) {
        output.push({ path: displayPath, mtime, is_new: true });
        continue;
      }
      if (mtime <= evaluatedAt) continue;
      output.push({ path: displayPath, mtime, is_new: false });
    }
  }

  if (fs.existsSync(GLOBAL_DIR)) processDir(GLOBAL_DIR);
  if (CWD_SKILLS_DIR && fs.existsSync(CWD_SKILLS_DIR)) processDir(CWD_SKILLS_DIR);

  console.log(JSON.stringify(output, null, 0));
}

main();
