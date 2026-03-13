'use strict';

const fs = require('fs');
const path = require('path');
const {
  formatRunId,
  normalizeLogPath,
  splitOutputLines,
  stripAnsi
} = require('../../scripts/lib/test-run-artifacts');

function createSuiteLogger({ filePath, runId, suite, path: suitePath } = {}) {
  const pino = require('pino');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, '', 'utf8');
  const dest = pino.destination({ dest: filePath, sync: true });
  const base = pino({
    base: { run_id: runId || formatRunId() },
    timestamp: () => `,"ts":"${new Date().toISOString()}"`,
    formatters: {
      level: (label) => ({ level: label })
    }
  }, dest);
  return base.child({
    suite: normalizeLogPath(suite || 'unknown'),
    ...(suitePath ? { path: normalizeLogPath(suitePath) } : {})
  });
}

function createPipelineLogger({ filePath, runId } = {}) {
  const pino = require('pino');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, '', 'utf8');
  const dest = pino.destination({ dest: filePath, sync: true });
  const base = pino({
    base: { run_id: runId || formatRunId() },
    timestamp: () => `,"ts":"${new Date().toISOString()}"`,
    formatters: {
      level: (label) => ({ level: label })
    }
  }, dest);

  function write(row) {
    const { message, data, ...rest } = row;

    // Flatten data sub-object into top level
    const flat = {
      ...rest,
      ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {})
    };

    // Strip nulls/undefined and normalize path-like fields
    const obj = {};
    for (const [k, v] of Object.entries(flat)) {
      if (v === null || v === undefined) {
        continue;
      }
      obj[k] = typeof v === 'string' && (k === 'path' || k === 'suite' || k.endsWith('_path') || k.endsWith('_file') || k.endsWith('_log'))
        ? normalizeLogPath(v)
        : v;
    }

    const level = obj.status === 'fail' ? 'error' : obj.status === 'skip' ? 'warn' : 'info';
    base[level](obj, message || '');
  }

  function writeOutput(stream, text, context = {}) {
    const { level: ctxLevel, message: _msg, ...ctxRest } = context;
    const level = ctxLevel || (stream === 'stderr' ? 'warn' : 'info');
    for (const line of splitOutputLines(text)) {
      if (!line) {
        continue;
      }
      base[level]({ kind: 'output', event: 'line', stream, ...ctxRest, text: stripAnsi(line) }, '');
    }
  }

  return { filePath, write, writeOutput };
}

module.exports = {
  createPipelineLogger,
  createSuiteLogger
};
