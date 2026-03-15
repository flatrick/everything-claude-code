/**
 * Unit tests for scripts/ci/validate-resolver-closure.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test } = require('../helpers/test-runner');
const {
  buildClosureMap,
  validateResolverClosure
} = require('../../scripts/ci/validate-resolver-closure');

const REPO_ROOT = path.join(__dirname, '..', '..');
const REAL_SNAPSHOT = path.join(REPO_ROOT, 'tests', 'fixtures', 'resolver-closure-snapshots.json');

function runTests() {
  console.log('\n=== Testing validate-resolver-closure.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('buildClosureMap returns entries for all three tools', () => {
    const map = buildClosureMap(REPO_ROOT);
    assert.ok(map.claude, 'claude key missing');
    assert.ok(map.cursor, 'cursor key missing');
    assert.ok(map.codex, 'codex key missing');
    const pkgNames = Object.keys(map.claude).sort();
    assert.ok(pkgNames.length > 0, 'no packages found');
    assert.deepStrictEqual(
      Object.keys(map.cursor).sort(),
      pkgNames,
      'cursor package list differs from claude'
    );
    assert.deepStrictEqual(
      Object.keys(map.codex).sort(),
      pkgNames,
      'codex package list differs from claude'
    );
  })) passed++; else failed++;

  if (test('continuous-learning-observer expands extends for codex target', () => {
    const map = buildClosureMap(REPO_ROOT);
    const entry = map.codex['continuous-learning-observer'];
    assert.ok(entry, 'entry missing');
    assert.strictEqual(entry.success, true);
    assert.deepStrictEqual(
      entry.packages,
      ['ai-learning', 'continuous-learning-observer'],
      'extends expansion did not include ai-learning'
    );
  })) passed++; else failed++;

  if (test('continuous-learning-observer fails for claude (tools mismatch)', () => {
    const map = buildClosureMap(REPO_ROOT);
    const entry = map.claude['continuous-learning-observer'];
    assert.ok(entry, 'entry missing');
    assert.strictEqual(entry.success, false);
    assert.ok(entry.errors.length > 0);
    assert.ok(entry.errors[0].includes('codex'), `unexpected error: ${entry.errors[0]}`);
  })) passed++; else failed++;

  if (test('context-compaction fails for codex (hooks unsupported)', () => {
    const map = buildClosureMap(REPO_ROOT);
    const entry = map.codex['context-compaction'];
    assert.ok(entry, 'entry missing');
    assert.strictEqual(entry.success, false);
    assert.ok(entry.errors.some((e) => e.includes('hooks')), `unexpected errors: ${entry.errors}`);
  })) passed++; else failed++;

  if (test('validateResolverClosure exits 0 when snapshot matches', () => {
    const io = { log: () => {}, error: () => {} };
    const result = validateResolverClosure(REPO_ROOT, io, { snapshotPath: REAL_SNAPSHOT });
    assert.strictEqual(result.exitCode, 0);
  })) passed++; else failed++;

  if (test('validateResolverClosure writes snapshot when file is missing', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdt-test-'));
    const tmpSnapshot = path.join(tmpDir, 'snap.json');
    const io = { log: () => {}, error: () => {} };
    const result = validateResolverClosure(REPO_ROOT, io, { snapshotPath: tmpSnapshot });
    assert.strictEqual(result.exitCode, 0);
    assert.ok(fs.existsSync(tmpSnapshot), 'snapshot file not created');
    const written = JSON.parse(fs.readFileSync(tmpSnapshot, 'utf8'));
    assert.ok(written.claude, 'written snapshot missing claude key');
    fs.rmSync(tmpDir, { recursive: true });
  })) passed++; else failed++;

  if (test('validateResolverClosure exits 1 when snapshot diverges', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdt-test-'));
    const tmpSnapshot = path.join(tmpDir, 'snap.json');
    // Write a stale snapshot with a fabricated entry
    const stale = { claude: { 'nonexistent-package': { success: true, packages: ['nonexistent-package'] } }, cursor: {}, codex: {} };
    fs.writeFileSync(tmpSnapshot, JSON.stringify(stale, null, 2), 'utf8');
    const errors = [];
    const io = { log: () => {}, error: (m) => errors.push(m) };
    const result = validateResolverClosure(REPO_ROOT, io, { snapshotPath: tmpSnapshot });
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.errors.length > 0);
    fs.rmSync(tmpDir, { recursive: true });
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
