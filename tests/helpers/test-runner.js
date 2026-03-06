'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function test(name, fn, options = {}) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    if (options.showStack && err.stack) {
      console.log(`    Stack: ${err.stack}`);
    }
    return false;
  }
}

async function asyncTest(name, fn, options = {}) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    if (options.showStack && err.stack) {
      console.log(`    Stack: ${err.stack}`);
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
  cleanupTestDir
};
