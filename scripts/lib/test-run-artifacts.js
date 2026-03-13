'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_ARTIFACT_ROOT = path.join('.artifacts', 'logs', 'test-runs');
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatRunId(date = new Date()) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('') + '.' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
}

function sanitizeArtifactName(name) {
  return String(name || 'unknown')
    .trim()
    .replace(/[\\/]+/g, '.')
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    || 'unknown';
}

function resolveArtifactRoot(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const logRoot = options.logRoot || DEFAULT_ARTIFACT_ROOT;
  return path.resolve(repoRoot, logRoot);
}

function ensureArtifactRoot(options = {}) {
  const artifactRoot = resolveArtifactRoot(options);
  fs.mkdirSync(artifactRoot, { recursive: true });
  return artifactRoot;
}

function buildArtifactPath(options = {}) {
  const artifactRoot = ensureArtifactRoot(options);
  const runId = options.runId || formatRunId();
  const artifactName = sanitizeArtifactName(options.name || 'unknown');
  const runDir = path.join(artifactRoot, runId);
  fs.mkdirSync(runDir, { recursive: true });
  return path.join(runDir, `${artifactName}.jsonl`);
}

function toRelativeArtifactPath(fromFilePath, targetPath) {
  const fromDir = path.dirname(path.resolve(fromFilePath));
  const target = path.resolve(targetPath);
  const relative = path.relative(fromDir, target);
  if (!relative) {
    return '.';
  }
  return relative.split(path.sep).join('/');
}

function normalizeLogPath(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return String(value).split(path.sep).join('/');
}

function stripAnsi(text) {
  return String(text || '').replace(ANSI_PATTERN, '');
}

function splitOutputLines(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');
}

module.exports = {
  DEFAULT_ARTIFACT_ROOT,
  buildArtifactPath,
  ensureArtifactRoot,
  formatRunId,
  normalizeLogPath,
  resolveArtifactRoot,
  sanitizeArtifactName,
  splitOutputLines,
  stripAnsi,
  toRelativeArtifactPath
};
