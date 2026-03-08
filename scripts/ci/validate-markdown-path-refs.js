#!/usr/bin/env node
/**
 * Validate runtime-critical markdown content does not reference missing
 * repo-local files or directories in inline code or obvious plain-text paths.
 */

const fs = require('fs');
const path = require('path');
const { readMarkdownFile, stripFrontmatter } = require('./markdown-utils');

const ROOT_DIR = path.join(__dirname, '../..');
const DEFAULT_IO = { log: console.log, error: console.error, warn: console.warn };
const DEFAULT_TARGET_PATHS = [
  path.join(ROOT_DIR, 'README.md'),
  path.join(ROOT_DIR, 'AGENTS.md'),
  path.join(ROOT_DIR, 'docs', 'supported-tools.md'),
  path.join(ROOT_DIR, 'docs', 'tools'),
  path.join(ROOT_DIR, 'skills'),
  path.join(ROOT_DIR, 'commands')
];

const ROOT_DIR_NAMES = [
  'agents',
  'commands',
  'docs',
  'examples',
  'hooks',
  'mcp-configs',
  'plugins',
  'rules',
  'schemas',
  'scripts',
  'skills'
];

const ROOT_FILE_NAMES = new Set([
  'AGENTS.md',
  'BACKLOG.md',
  'CLAUDE.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'NEXT-STEPS.md',
  'README.md',
  'package.json'
]);

const INLINE_CODE_RE = /`([^`\r\n]+)`/g;
const BARE_PATH_RE = /(^|[^A-Za-z0-9_./-])((?:agents|commands|docs|examples|hooks|mcp-configs|plugins|rules|schemas|scripts|skills)(?:\/[A-Za-z0-9._-]+)*\/?)(?=$|[^A-Za-z0-9_./-])/g;
const MARKDOWN_LINK_RE = /!?\[[^\]]*]\([^)]+\)/g;
const GENERATIVE_LINE_RE = /\b(create|creates|creating|generate|generates|generating|generate or update|generated|would create)\b/i;

function collectMarkdownFiles(entryPath, files = []) {
  if (!fs.existsSync(entryPath)) return files;

  const stat = fs.statSync(entryPath);
  if (stat.isFile()) {
    if (entryPath.endsWith('.md')) files.push(entryPath);
    return files;
  }

  for (const entryName of fs.readdirSync(entryPath)) {
    if (entryName === 'node_modules' || entryName === '.git') continue;
    collectMarkdownFiles(path.join(entryPath, entryName), files);
  }
  return files;
}

function stripMarkdownLinks(content) {
  return content.replace(MARKDOWN_LINK_RE, '');
}

function sanitizeCandidatePath(rawValue) {
  let value = rawValue.trim();
  value = value.replace(/^[("'[\s]+/, '');
  value = value.replace(/[)"'\],.:;!?]+$/, '');
  value = value.replace(/^\.\/+/, '');
  value = value.replace(/#.*$/, '');
  value = value.replace(/\?[^/]*$/, '');
  return value;
}

function hasInvalidCandidateSyntax(candidate) {
  return (
    !candidate ||
    candidate.includes('\\') ||
    candidate.includes('://') ||
    candidate.startsWith('~') ||
    candidate.startsWith('/') ||
    candidate.includes('$') ||
    candidate.includes('<') ||
    candidate.includes('>') ||
    candidate.includes('*') ||
    candidate === '.' ||
    candidate === '..'
  );
}

function isRepoPathCandidate(candidate) {
  if (hasInvalidCandidateSyntax(candidate)) return false;
  if (ROOT_FILE_NAMES.has(candidate)) return true;
  return ROOT_DIR_NAMES.some(dirName => candidate === dirName || candidate.startsWith(`${dirName}/`));
}

function isBarePathCandidate(candidate) {
  if (!isRepoPathCandidate(candidate)) return false;
  return candidate.endsWith('/') || /\.[A-Za-z0-9]+$/.test(candidate);
}

function resolveCandidatePath(rootDir, candidate) {
  return path.join(rootDir, candidate);
}

function candidateExists(rootDir, candidate) {
  return fs.existsSync(resolveCandidatePath(rootDir, candidate));
}

function splitIntoScannableLines(content) {
  const lines = stripFrontmatter(content).split(/\r?\n/);
  const scannable = [];
  let inFence = false;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!inFence && /^```/.test(trimmed)) {
      inFence = true;
      continue;
    }

    if (inFence) {
      if (/^```$/.test(trimmed)) {
        inFence = false;
      }
      continue;
    }

    scannable.push({ line, lineNumber: index + 1 });
  }

  return scannable;
}

function extractInlineCodePathRefs(lines) {
  const refs = [];
  for (const { line, lineNumber } of lines) {
    if (GENERATIVE_LINE_RE.test(line)) continue;
    for (const match of line.matchAll(INLINE_CODE_RE)) {
      const candidate = sanitizeCandidatePath(match[1]);
      if (!isRepoPathCandidate(candidate)) continue;
      refs.push({
        source: 'inline-code',
        raw: match[1],
        candidate,
        lineNumber
      });
    }
  }
  return refs;
}

function extractBarePathRefs(lines) {
  const refs = [];
  for (const { line, lineNumber } of lines) {
    if (GENERATIVE_LINE_RE.test(line)) continue;
    const contentNoLinks = stripMarkdownLinks(line);
    for (const match of contentNoLinks.matchAll(BARE_PATH_RE)) {
      const candidate = sanitizeCandidatePath(match[2]);
      if (!isBarePathCandidate(candidate)) continue;
      refs.push({
        source: 'plain-text',
        raw: match[2],
        candidate,
        lineNumber
      });
    }
  }
  return refs;
}

function uniqueRefs(refs) {
  const seen = new Set();
  const result = [];
  for (const ref of refs) {
    const key = `${ref.lineNumber}:${ref.candidate}:${ref.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(ref);
  }
  return result;
}

function validateMarkdownPathRefs(options = {}) {
  const rootDir = options.rootDir || ROOT_DIR;
  const targetPaths = options.targetPaths || DEFAULT_TARGET_PATHS;
  const io = options.io || DEFAULT_IO;
  const markdownFiles = targetPaths
    .flatMap(entryPath => collectMarkdownFiles(entryPath))
    .sort();

  let checkedRefCount = 0;
  let hasErrors = false;

  for (const filePath of markdownFiles) {
    const relativeFilePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const rawContent = readMarkdownFile(filePath);
    const lines = splitIntoScannableLines(rawContent);
    const refs = uniqueRefs([
      ...extractInlineCodePathRefs(lines),
      ...extractBarePathRefs(lines)
    ]);

    for (const ref of refs) {
      checkedRefCount++;
      if (candidateExists(rootDir, ref.candidate)) continue;
      io.error(
        `ERROR: ${relativeFilePath}:${ref.lineNumber} - references missing repo path ${ref.candidate} (${ref.source})`
      );
      hasErrors = true;
    }
  }

  if (hasErrors) {
    return {
      exitCode: 1,
      validatedCount: markdownFiles.length,
      checkedRefCount,
      hasErrors: true
    };
  }

  io.log(`Validated ${markdownFiles.length} markdown files (${checkedRefCount} repo path references checked)`);
  return {
    exitCode: 0,
    validatedCount: markdownFiles.length,
    checkedRefCount,
    hasErrors: false
  };
}

if (require.main === module) {
  const result = validateMarkdownPathRefs();
  process.exit(result.exitCode);
}

module.exports = {
  collectMarkdownFiles,
  extractBarePathRefs,
  extractInlineCodePathRefs,
  isRepoPathCandidate,
  isBarePathCandidate,
  sanitizeCandidatePath,
  splitIntoScannableLines,
  validateMarkdownPathRefs
};
