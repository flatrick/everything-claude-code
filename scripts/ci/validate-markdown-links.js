#!/usr/bin/env node
/**
 * Validate local markdown links and heading anchors across the repository.
 *
 * External URLs are reported as skipped so this validator stays deterministic
 * and offline-friendly in CI.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { readMarkdownFile, stripFrontmatter } = require('./markdown-utils');

const ROOT_DIR = path.join(__dirname, '../..');
const DEFAULT_IO = { log: console.log, error: console.error, warn: console.warn };
const MARKDOWN_EXT_RE = /\.md$/i;
const SKIP_DIRS = new Set(['.git', 'node_modules']);

function normalizeSlashes(value) {
  return value.replace(/\\/g, '/');
}

function isExternalTarget(target) {
  return /^(https?:|mailto:|tel:|data:)/i.test(target);
}

function stripCodeBlocks(content) {
  return content.replace(/```[\s\S]*?```/g, '');
}

function collectMarkdownFiles(rootDir) {
  const files = [];

  function visit(dirPath) {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        visit(path.join(dirPath, entry.name));
        continue;
      }
      if (entry.isFile() && MARKDOWN_EXT_RE.test(entry.name)) {
        files.push(path.join(dirPath, entry.name));
      }
    }
  }

  visit(rootDir);
  return files;
}

function toHeadingSlug(text, seenCounts) {
  const cleaned = text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\- _]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const base = cleaned || 'section';
  const seen = seenCounts.get(base) || 0;
  seenCounts.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen}`;
}

function buildAnchorSet(content) {
  const stripped = stripCodeBlocks(stripFrontmatter(content));
  const seenCounts = new Map();
  const anchors = new Set();

  for (const line of stripped.split(/\r?\n/)) {
    const match = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (!match) continue;
    anchors.add(toHeadingSlug(match[1], seenCounts));
  }

  return anchors;
}

function splitTarget(rawTarget) {
  const target = rawTarget.trim();
  if (target.startsWith('#')) {
    return { pathPart: '', anchorPart: target.slice(1) };
  }

  const hashIndex = target.indexOf('#');
  if (hashIndex === -1) {
    return { pathPart: target, anchorPart: '' };
  }

  return {
    pathPart: target.slice(0, hashIndex),
    anchorPart: target.slice(hashIndex + 1)
  };
}

function parseLinkTarget(rawTarget) {
  let target = rawTarget.trim();
  if (target.startsWith('<') && target.endsWith('>')) {
    target = target.slice(1, -1).trim();
  }

  const titled = target.match(/^(\S+)(?:\s+["'][^"']*["'])$/);
  if (titled) {
    target = titled[1];
  }

  return target;
}

function lineNumberForIndex(content, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

function extractMarkdownLinks(content) {
  const stripped = stripCodeBlocks(stripFrontmatter(content));
  const links = [];
  const regex = /!?\[[^\]]*]\(([^)]+)\)/g;

  for (const match of stripped.matchAll(regex)) {
    const rawTarget = match[1];
    const target = parseLinkTarget(rawTarget);
    links.push({
      target,
      line: lineNumberForIndex(stripped, match.index || 0)
    });
  }

  return links;
}

function resolveTargetPath(filePath, repoRoot, targetPath) {
  if (!targetPath) return filePath;
  if (path.isAbsolute(targetPath)) return targetPath;
  if (targetPath.startsWith('/')) return path.join(repoRoot, targetPath.slice(1));
  return path.resolve(path.dirname(filePath), targetPath);
}

function validateMarkdownLinks(options = {}) {
  const repoRoot = options.repoRoot || ROOT_DIR;
  const io = options.io || DEFAULT_IO;
  const markdownFiles = options.markdownFiles || collectMarkdownFiles(repoRoot);

  let hasErrors = false;
  let checkedLinks = 0;
  let skippedExternal = 0;
  const anchorCache = new Map();

  for (const filePath of markdownFiles) {
    let content;
    try {
      content = readMarkdownFile(filePath);
    } catch (error) {
      io.error(`ERROR: ${normalizeSlashes(path.relative(repoRoot, filePath))} - ${error.message}`);
      hasErrors = true;
      continue;
    }

    const links = extractMarkdownLinks(content);
    for (const link of links) {
      const target = link.target;
      if (!target) continue;
      if (isExternalTarget(target)) {
        skippedExternal++;
        continue;
      }

      checkedLinks++;
      const { pathPart, anchorPart } = splitTarget(target);
      const resolvedPath = resolveTargetPath(filePath, repoRoot, pathPart);
      const displayFile = normalizeSlashes(path.relative(repoRoot, filePath));

      if (pathPart && !fs.existsSync(resolvedPath)) {
        io.error(`ERROR: ${displayFile}:${link.line} - broken local link target "${target}"`);
        hasErrors = true;
        continue;
      }

      if (!anchorPart) {
        continue;
      }

      const anchorFile = pathPart ? resolvedPath : filePath;
      if (!MARKDOWN_EXT_RE.test(anchorFile)) {
        continue;
      }

      let anchors = anchorCache.get(anchorFile);
      if (!anchors) {
        try {
          anchors = buildAnchorSet(readMarkdownFile(anchorFile));
        } catch (error) {
          io.error(`ERROR: ${displayFile}:${link.line} - failed to read anchor target "${target}": ${error.message}`);
          hasErrors = true;
          continue;
        }
        anchorCache.set(anchorFile, anchors);
      }

      if (!anchors.has(anchorPart.toLowerCase())) {
        io.error(`ERROR: ${displayFile}:${link.line} - broken markdown anchor "${target}"`);
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    return { exitCode: 1, checkedLinks, skippedExternal, hasErrors: true };
  }

  io.log(`Validated ${markdownFiles.length} markdown files (${checkedLinks} local links checked, ${skippedExternal} external links skipped)`);
  return { exitCode: 0, checkedLinks, skippedExternal, hasErrors: false };
}

if (require.main === module) {
  const result = validateMarkdownLinks();
  process.exit(result.exitCode);
}

module.exports = {
  buildAnchorSet,
  collectMarkdownFiles,
  extractMarkdownLinks,
  parseLinkTarget,
  validateMarkdownLinks
};
