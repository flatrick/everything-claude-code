#!/usr/bin/env node
/**
 * Shared markdown helpers for CI validators.
 */

const fs = require('fs');

function readMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.replace(/^\uFEFF/, '');
}

function hasMarkdownHeading(content) {
  return /^#{1,6}\s+\S/m.test(content);
}

function stripFrontmatter(content) {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

module.exports = {
  readMarkdownFile,
  hasMarkdownHeading,
  stripFrontmatter
};
