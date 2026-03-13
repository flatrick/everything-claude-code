'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

class SkipTestError extends Error {
  constructor(message) {
    super(message || 'skipped');
    this.name = 'SkipTestError';
  }
}

function skipTest(message) {
  throw new SkipTestError(message);
}

// When running under run-all.js, MDT_SUITE_LOG_FILE is set and we write
// structured events directly via pino. Otherwise fall back to console.log
// so individual test files can still be run standalone.
let _logger = null;
const _counts = { passed: 0, failed: 0, skipped: 0 };
const _startMs = Date.now();

if (process.env.MDT_SUITE_LOG_FILE) {
  const { createSuiteLogger } = require('../../scripts/lib/test-run-artifacts');
  _logger = createSuiteLogger({
    filePath: process.env.MDT_SUITE_LOG_FILE,
    runId: process.env.MDT_TEST_RUN_ID,
    suite: process.env.MDT_SUITE_NAME,
    path: process.env.MDT_SUITE_PATH
  });
}

process.on('exit', (code) => {
  if (!_logger) {
    return;
  }
  const total = _counts.passed + _counts.failed + _counts.skipped;
  const status = _counts.failed > 0 ? 'fail'
    : total > 0 && _counts.skipped === total ? 'skip'
      : 'pass';
  _logger.info({
    kind: 'suite',
    event: 'finish',
    status,
    passed: _counts.passed,
    failed: _counts.failed,
    skipped: _counts.skipped,
    total,
    duration_ms: Date.now() - _startMs,
    exit_code: code
  }, '');
});

function test(name, fn, options = {}) {
  try {
    fn();
    _counts.passed++;
    if (_logger) {
      _logger.info({ kind: 'test', event: 'finish', status: 'pass', test: name }, '');
    } else {
      console.log(`  ✓ ${name}`);
    }
    return true;
  } catch (err) {
    if (err instanceof SkipTestError) {
      _counts.skipped++;
      if (_logger) {
        _logger.info({ kind: 'test', event: 'finish', status: 'skip', test: name }, err.message);
      } else {
        console.log(`  - ${name} (skipped - ${err.message})`);
      }
      return null;
    }
    _counts.failed++;
    if (_logger) {
      _logger.error({ kind: 'test', event: 'finish', status: 'fail', test: name }, err.message);
    } else {
      console.log(`  ✗ ${name}`);
      console.log(`    Error: ${err.message}`);
      if (options.showStack && err.stack) {
        console.log(`    Stack: ${err.stack}`);
      }
    }
    return false;
  }
}

async function asyncTest(name, fn, options = {}) {
  try {
    await fn();
    _counts.passed++;
    if (_logger) {
      _logger.info({ kind: 'test', event: 'finish', status: 'pass', test: name }, '');
    } else {
      console.log(`  ✓ ${name}`);
    }
    return true;
  } catch (err) {
    if (err instanceof SkipTestError) {
      _counts.skipped++;
      if (_logger) {
        _logger.info({ kind: 'test', event: 'finish', status: 'skip', test: name }, err.message);
      } else {
        console.log(`  - ${name} (skipped - ${err.message})`);
      }
      return null;
    }
    _counts.failed++;
    if (_logger) {
      _logger.error({ kind: 'test', event: 'finish', status: 'fail', test: name }, err.message);
    } else {
      console.log(`  ✗ ${name}`);
      console.log(`    Error: ${err.message}`);
      if (options.showStack && err.stack) {
        console.log(`    Stack: ${err.stack}`);
      }
    }
    return false;
  }
}

function createTestDir(prefix = 'test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanupTestDir(testDir) {
  fs.rmSync(testDir, { recursive: true, force: true });
}

module.exports = {
  test,
  asyncTest,
  createTestDir,
  cleanupTestDir,
  skipTest
};
