const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, createTestDir, cleanupTestDir } = require('../helpers/test-runner');
const { readSuiteSummaryFromLog, readTestLabelsByStatus } = require('../run-all');

function writePinoLines(filePath, rows) {
  fs.writeFileSync(
    filePath,
    rows.map((r) => JSON.stringify(r)).join('\n') + '\n',
    'utf8'
  );
}

function runTests() {
  console.log('\n=== Testing run-all.js suite log readers ===\n');

  let passed = 0;
  let failed = 0;

  if (test('readSuiteSummaryFromLog returns the last kind:suite row', () => {
    const tempDir = createTestDir('run-all-readers-');
    try {
      const logFile = path.join(tempDir, 'suite.jsonl');
      writePinoLines(logFile, [
        { kind: 'test', event: 'finish', status: 'pass', test: 'first test' },
        { kind: 'test', event: 'finish', status: 'fail', test: 'second test' },
        { kind: 'suite', event: 'finish', status: 'fail', passed: 1, failed: 1, skipped: 0, total: 2 }
      ]);
      const summary = readSuiteSummaryFromLog(logFile);
      assert.ok(summary, 'Expected a suite summary row');
      assert.strictEqual(summary.status, 'fail');
      assert.strictEqual(summary.passed, 1);
      assert.strictEqual(summary.failed, 1);
      assert.strictEqual(summary.total, 2);
    } finally {
      cleanupTestDir(tempDir);
    }
  })) passed++; else failed++;

  if (test('readSuiteSummaryFromLog returns null when no suite row exists', () => {
    const tempDir = createTestDir('run-all-readers-');
    try {
      const logFile = path.join(tempDir, 'suite.jsonl');
      writePinoLines(logFile, [
        { kind: 'test', event: 'finish', status: 'pass', test: 'a test' }
      ]);
      assert.strictEqual(readSuiteSummaryFromLog(logFile), null);
    } finally {
      cleanupTestDir(tempDir);
    }
  })) passed++; else failed++;

  if (test('readSuiteSummaryFromLog returns null for missing file', () => {
    assert.strictEqual(
      readSuiteSummaryFromLog('/nonexistent/path/suite.jsonl'),
      null
    );
  })) passed++; else failed++;

  if (test('readTestLabelsByStatus returns failed test names', () => {
    const tempDir = createTestDir('run-all-readers-');
    try {
      const logFile = path.join(tempDir, 'suite.jsonl');
      writePinoLines(logFile, [
        { kind: 'test', event: 'finish', status: 'pass', test: 'passes fine' },
        { kind: 'test', event: 'finish', status: 'fail', test: 'broke badly', msg: 'assertion failed' },
        { kind: 'test', event: 'finish', status: 'fail', test: 'also broke', msg: 'timeout' }
      ]);
      const labels = readTestLabelsByStatus(logFile, 'fail');
      assert.deepStrictEqual(labels, ['broke badly', 'also broke']);
    } finally {
      cleanupTestDir(tempDir);
    }
  })) passed++; else failed++;

  if (test('readTestLabelsByStatus includes skip reason in label', () => {
    const tempDir = createTestDir('run-all-readers-');
    try {
      const logFile = path.join(tempDir, 'suite.jsonl');
      writePinoLines(logFile, [
        { kind: 'test', event: 'finish', status: 'skip', test: 'chmod probe', msg: 'chmod ineffective on Windows' }
      ]);
      const labels = readTestLabelsByStatus(logFile, 'skip');
      assert.deepStrictEqual(labels, ['chmod probe - chmod ineffective on Windows']);
    } finally {
      cleanupTestDir(tempDir);
    }
  })) passed++; else failed++;

  if (test('readTestLabelsByStatus tolerates malformed lines', () => {
    const tempDir = createTestDir('run-all-readers-');
    try {
      const logFile = path.join(tempDir, 'suite.jsonl');
      fs.writeFileSync(logFile, 'not json\n{"kind":"test","event":"finish","status":"fail","test":"real failure","msg":""}\n', 'utf8');
      const labels = readTestLabelsByStatus(logFile, 'fail');
      assert.deepStrictEqual(labels, ['real failure']);
    } finally {
      cleanupTestDir(tempDir);
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
