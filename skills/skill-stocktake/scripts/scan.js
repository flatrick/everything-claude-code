#!/usr/bin/env node
/**
 * scan.js — Enumerate skill files, extract frontmatter and UTC mtime.
 *
 * Usage: node scan.js [CWD_SKILLS_DIR]
 * Output: JSON to stdout
 *
 * When CWD_SKILLS_DIR is omitted, defaults to $PWD/.cursor/skills or .claude/skills
 * based on detect-env. Override via SKILL_STOCKTAKE_PROJECT_DIR.
 *
 * Environment:
 *   SKILL_STOCKTAKE_GLOBAL_DIR   Override config dir skills (for testing)
 *   SKILL_STOCKTAKE_PROJECT_DIR  Override project dir (for testing)
 *   SKILL_STOCKTAKE_OBSERVATIONS Path to observations.jsonl for usage counts
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Resolve utils/detect-env from repo: when run from skill dir, go up to config root
function getScriptRoot() {
  const skillDir = __dirname; // .../skills/skill-stocktake/scripts
  const skillsParent = path.join(skillDir, '..', '..', '..'); // config root (e.g. .cursor or repo)
  return skillsParent;
}

function loadDetectEnv() {
  const root = getScriptRoot();
  const scriptsLib = path.join(root, 'scripts', 'lib');
  try {
    return require(path.join(scriptsLib, 'detect-env.js')).detectEnv;
  } catch {
    // Fallback when run from repo: repo root has scripts/lib
    const repoRoot = path.join(__dirname, '..', '..', '..');
    return require(path.join(repoRoot, 'scripts', 'lib', 'detect-env.js')).detectEnv;
  }
}

function loadUtils() {
  const root = getScriptRoot();
  const scriptsLib = path.join(root, 'scripts', 'lib');
  try {
    return require(path.join(scriptsLib, 'utils.js'));
  } catch {
    const repoRoot = path.join(__dirname, '..', '..', '..');
    return require(path.join(repoRoot, 'scripts', 'lib', 'utils.js'));
  }
}

const detectEnv = loadDetectEnv();
const { findFiles, readFile } = loadUtils();

const GLOBAL_DIR = process.env.SKILL_STOCKTAKE_GLOBAL_DIR || path.join(detectEnv.getConfigDir(), 'skills');
const CWD_SKILLS_DIR = process.env.SKILL_STOCKTAKE_PROJECT_DIR || process.argv[2] || path.join(process.cwd(), '.cursor', 'skills');
const OBSERVATIONS = process.env.SKILL_STOCKTAKE_OBSERVATIONS || path.join(detectEnv.getDataDir(), 'homunculus', 'observations.jsonl');

const homeDir = os.homedir();

function extractField(filePath, field) {
  const content = readFile(filePath);
  if (!content) return '';
  let inFrontmatter = false;
  let frontmatterCount = 0;
  for (const line of content.split('\n')) {
    if (line.trim() === '---') {
      frontmatterCount++;
      if (frontmatterCount === 1) inFrontmatter = true;
      else if (frontmatterCount >= 2) break;
      continue;
    }
    if (inFrontmatter && line.startsWith(field + ': ')) {
      let val = line.slice(field.length + 2).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      return val;
    }
  }
  return '';
}

function dateAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function countObservations(filePath, cutoff) {
  if (!fs.existsSync(OBSERVATIONS)) return 0;
  const content = fs.readFileSync(OBSERVATIONS, 'utf8');
  let count = 0;
  const pathNorm = filePath.replace(/\\/g, '/');
  const pathNormTilde = filePath.startsWith(homeDir) ? '~' + filePath.slice(homeDir.length).replace(/\\/g, '/') : pathNorm;
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.tool !== 'Read' || !obj.timestamp || obj.timestamp < cutoff) continue;
      let match = false;
      if (obj.path && obj.path.replace(/\\/g, '/') === pathNormTilde) match = true;
      if (!match && obj.input) {
        const inp = typeof obj.input === 'string' ? JSON.parse(obj.input) : obj.input;
        const fp = inp && (inp.file_path || inp.path);
        if (fp && fp.replace(/\\/g, '/') === pathNorm) match = true;
        if (fp && fp.replace(/\\/g, '/') === pathNormTilde) match = true;
      }
      if (match) count++;
    } catch {
      // skip malformed lines
    }
  }
  return count;
}

function scanDirToJson(dir) {
  const c7 = dateAgo(7);
  const c30 = dateAgo(30);

  const results = [];
  const mdFiles = findFiles(dir, '*.md', { recursive: true })
    .map(f => f.path)
    .filter(p => p.endsWith('.md'))
    .sort();

  for (const file of mdFiles) {
    const name = extractField(file, 'name');
    const desc = extractField(file, 'description');
    const stat = fs.statSync(file);
    const mtime = new Date(stat.mtime).toISOString().replace(/\.\d{3}Z$/, 'Z');
    const u7 = countObservations(file, c7);
    const u30 = countObservations(file, c30);
    const displayPath = file.startsWith(homeDir) ? '~' + file.slice(homeDir.length).replace(/\\/g, '/') : file.replace(/\\/g, '/');

    results.push({
      path: displayPath,
      name,
      description: desc,
      use_7d: u7,
      use_30d: u30,
      mtime
    });
  }

  return results;
}

function main() {
  if (CWD_SKILLS_DIR && fs.existsSync(CWD_SKILLS_DIR)) {
    const normalized = CWD_SKILLS_DIR.replace(/\\/g, '/');
    if (!normalized.includes('.claude/skills') && !normalized.includes('.cursor/skills')) {
      console.error(`Warning: CWD_SKILLS_DIR does not look like a .claude/skills or .cursor/skills path: ${CWD_SKILLS_DIR}`);
    }
  }

  let globalFound = false;
  let globalCount = 0;
  let globalSkills = [];

  if (fs.existsSync(GLOBAL_DIR)) {
    globalFound = true;
    globalSkills = scanDirToJson(GLOBAL_DIR);
    globalCount = globalSkills.length;
  }

  let projectFound = false;
  let projectPath = '';
  let projectCount = 0;
  let projectSkills = [];

  if (CWD_SKILLS_DIR && fs.existsSync(CWD_SKILLS_DIR)) {
    projectFound = true;
    projectPath = CWD_SKILLS_DIR;
    projectSkills = scanDirToJson(CWD_SKILLS_DIR);
    projectCount = projectSkills.length;
  }

  const allSkills = [...globalSkills, ...projectSkills];

  const output = {
    scan_summary: {
      global: { found: globalFound, count: globalCount },
      project: { found: projectFound, path: projectPath, count: projectCount }
    },
    skills: allSkills
  };

  console.log(JSON.stringify(output, null, 0));
}

main();
