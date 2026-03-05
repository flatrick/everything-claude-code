#!/usr/bin/env node
/**
 * Continuous Learning - Session Evaluator
 *
 * Runs on Stop hook to extract reusable patterns from Claude Code sessions.
 * Reads transcript_path from stdin JSON (Claude Code hook input).
 *
 * Paths: uses detect-env so config/learned skills dir work for both Cursor and Claude Code.
 */

const path = require('path');
const fs = require('fs');

const skillRoot = __dirname;

function getConfigDir() {
  const root = path.join(skillRoot, '..', '..');
  try {
    return require(path.join(root, 'scripts', 'lib', 'detect-env.js')).detectEnv.getConfigDir();
  } catch {
    return require(path.join(root, 'scripts', 'lib', 'utils.js')).getConfigDir();
  }
}

function getLearnedSkillsDir() {
  return path.join(getConfigDir(), 'skills', 'learned');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function countInFile(filePath, pattern) {
  const content = readFile(filePath);
  if (!content) return 0;
  const regex = pattern.global ? pattern : new RegExp(pattern.source, pattern.flags + 'g');
  const m = content.match(regex);
  return m ? m.length : 0;
}

let stdinData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { stdinData += chunk; });
process.stdin.on('end', () => {
  (function main() {
    let transcriptPath = null;
    try {
      const input = JSON.parse(stdinData);
      transcriptPath = input.transcript_path;
    } catch {
      transcriptPath = process.env.CLAUDE_TRANSCRIPT_PATH;
    }

    const configFile = path.join(skillRoot, 'config.json');
    let minSessionLength = 10;
    let learnedSkillsPath = getLearnedSkillsDir();

    const configContent = readFile(configFile);
    if (configContent) {
      try {
        const config = JSON.parse(configContent);
        minSessionLength = config.min_session_length ?? 10;
        if (config.learned_skills_path) {
          learnedSkillsPath = config.learned_skills_path.replace(/^~/, require('os').homedir());
        }
      } catch (_) {}
    }

    ensureDir(learnedSkillsPath);

    if (!transcriptPath || !fs.existsSync(transcriptPath)) {
      process.exit(0);
      return;
    }

    const messageCount = countInFile(transcriptPath, /"type"\s*:\s*"user"/g);

    if (messageCount < minSessionLength) {
      console.error(`[ContinuousLearning] Session too short (${messageCount} messages), skipping`);
      process.exit(0);
      return;
    }

    console.error(`[ContinuousLearning] Session has ${messageCount} messages - evaluate for extractable patterns`);
    console.error(`[ContinuousLearning] Save learned skills to: ${learnedSkillsPath}`);
    process.exit(0);
  })();
});
