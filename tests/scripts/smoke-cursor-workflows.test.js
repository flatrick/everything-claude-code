const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test, createTestDir, cleanupTestDir } = require('../helpers/test-runner');
const { smokeCursorWorkflows } = require('../../scripts/smoke-cursor-workflows');

function writeFile(rootDir, relativePath, content) {
  const absolutePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
}

function createWorkspaceFixtureRoot() {
  const rootDir = createTestDir('cursor-workflow-workspace-');

  writeFile(
    rootDir,
    'AGENTS.md',
    [
      '# AGENTS',
      '3. **Security-First** — Never compromise on security; validate all inputs',
      '5. **Plan Before Execute** — Plan complex features before writing code',
      '**TDD workflow (mandatory):**',
      '3. **E2E tests** — Critical user flows'
    ].join('\n')
  );

  writeFile(rootDir, path.join('cursor-template', 'commands', 'plan.md'), '# Plan');
  writeFile(rootDir, path.join('cursor-template', 'commands', 'tdd.md'), '# TDD');
  writeFile(rootDir, path.join('cursor-template', 'commands', 'code-review.md'), '# Code Review');
  writeFile(rootDir, path.join('cursor-template', 'commands', 'verify.md'), '# Verify');
  writeFile(rootDir, path.join('cursor-template', 'commands', 'smoke.md'), '# Smoke');
  writeFile(rootDir, path.join('cursor-template', 'commands', 'e2e.md'), '# E2E');
  writeFile(rootDir, path.join('cursor-template', 'rules', 'common-development-workflow.md'), '# Plan before code');
  writeFile(rootDir, path.join('cursor-template', 'rules', 'common-testing.md'), '# Write tests first');
  writeFile(rootDir, path.join('cursor-template', 'rules', 'common-coding-style.md'), '# Coding Style');
  writeFile(rootDir, path.join('cursor-template', 'rules', 'common-security.md'), '# Security');
  writeFile(rootDir, path.join('docs', 'testing', 'manual-verification', 'cursor.md'), '# Cursor Manual Verification');

  return rootDir;
}

function createInstalledFixtureRoot() {
  const workspaceRoot = createTestDir('cursor-installed-workspace-');
  const cursorRoot = createTestDir('cursor-installed-global-');

  writeFile(
    workspaceRoot,
    'AGENTS.md',
    [
      '# AGENTS',
      '3. **Security-First** — Never compromise on security; validate all inputs',
      '5. **Plan Before Execute** — Plan complex features before writing code',
      '**TDD workflow (mandatory):**',
      '3. **E2E tests** — Critical user flows'
    ].join('\n')
  );

  writeFile(cursorRoot, path.join('commands', 'plan.md'), '# Plan');
  writeFile(cursorRoot, path.join('commands', 'tdd.md'), '# TDD');
  writeFile(cursorRoot, path.join('commands', 'code-review.md'), '# Code Review');
  writeFile(cursorRoot, path.join('commands', 'verify.md'), '# Verify');
  writeFile(cursorRoot, path.join('commands', 'smoke.md'), '# Smoke');
  writeFile(cursorRoot, path.join('commands', 'e2e.md'), '# E2E');
  writeFile(cursorRoot, path.join('rules', 'common-development-workflow.mdc'), '# Plan');
  writeFile(cursorRoot, path.join('rules', 'common-testing.mdc'), '# Tests');
  writeFile(cursorRoot, path.join('rules', 'common-coding-style.mdc'), '# Coding Style');
  writeFile(cursorRoot, path.join('rules', 'common-security.mdc'), '# Security');
  writeFile(cursorRoot, path.join('mdt', 'scripts', 'smoke-cursor-workflows.js'), '// smoke');

  return { workspaceRoot, cursorRoot };
}

function runTests() {
  console.log('\n=== Testing smoke-cursor-workflows.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('passes on the real repository', () => {
    const output = [];
    const result = smokeCursorWorkflows({
      io: {
        log: message => output.push(String(message))
      }
    });

    assert.strictEqual(result.exitCode, 0, output.join('\n'));
    assert.ok(output.join('\n').includes('Cursor workflow smoke (repo-source mode):'));
    assert.ok(output.join('\n').includes('plan: PASS'));
    assert.ok(output.join('\n').includes('tdd: PASS'));
    assert.ok(output.join('\n').includes('code-review: PASS'));
    assert.ok(output.join('\n').includes('verify: PASS'));
    assert.ok(output.join('\n').includes('smoke: SKIP') || output.join('\n').includes('smoke: PASS'));
  })) passed++; else failed++;

  if (test('reports repo-source smoke as SKIP when CLI probes are blocked but contract files exist', () => {
    const workspaceRoot = createWorkspaceFixtureRoot();

    try {
      const output = [];
      const result = smokeCursorWorkflows({
        workspaceRoot,
        io: {
          log: message => output.push(String(message))
        },
        spawnImpl: () => ({
          error: Object.assign(new Error('spawn EPERM'), { code: 'EPERM' })
        })
      });

      assert.strictEqual(result.exitCode, 0, 'Expected blocked CLI probes to produce a non-failing smoke result');
      assert.ok(output.join('\n').includes('smoke: SKIP'));
      assert.ok(output.join('\n').includes('Cursor CLI smoke was skipped'));
    } finally {
      cleanupTestDir(workspaceRoot);
    }
  })) passed++; else failed++;

  if (test('fails when repo-source smoke contract files are missing', () => {
    const workspaceRoot = createWorkspaceFixtureRoot();

    try {
      fs.rmSync(path.join(workspaceRoot, 'cursor-template', 'commands', 'smoke.md'));
      const output = [];
      const result = smokeCursorWorkflows({
        workspaceRoot,
        io: {
          log: message => output.push(String(message))
        },
        spawnImpl: () => ({ status: 0, stdout: 'agent help' })
      });

      assert.strictEqual(result.exitCode, 1, 'Expected missing smoke contract files to fail');
      assert.ok(output.join('\n').includes('smoke: FAIL'));
      assert.ok(output.join('\n').includes('cursor-template/commands/smoke.md'));
    } finally {
      cleanupTestDir(workspaceRoot);
    }
  })) passed++; else failed++;

  if (test('fails when the Cursor planning rule is missing', () => {
    const workspaceRoot = createWorkspaceFixtureRoot();

    try {
      fs.rmSync(path.join(workspaceRoot, 'cursor-template', 'rules', 'common-development-workflow.md'));
      const output = [];
      const result = smokeCursorWorkflows({
        workspaceRoot,
        io: {
          log: message => output.push(String(message))
        },
        spawnImpl: () => ({ status: 0, stdout: 'agent help' })
      });

      assert.strictEqual(result.exitCode, 1, 'Expected missing plan artifact to fail');
      assert.ok(output.join('\n').includes('plan: FAIL'));
      assert.ok(output.join('\n').includes('cursor-template/rules/common-development-workflow.md'));
    } finally {
      cleanupTestDir(workspaceRoot);
    }
  })) passed++; else failed++;

  if (test('passes in installed target mode using workspace AGENTS and global Cursor content', () => {
    const { workspaceRoot, cursorRoot } = createInstalledFixtureRoot();

    try {
      const output = [];
      const result = smokeCursorWorkflows({
        workspaceRoot,
        cursorRoot,
        io: {
          log: message => output.push(String(message))
        },
        spawnImpl: () => ({ status: 0, stdout: 'agent help' })
      });

      assert.strictEqual(result.exitCode, 0, output.join('\n'));
      assert.ok(output.join('\n').includes('installed-target'));
      assert.ok(output.join('\n').includes('plan: PASS'));
      assert.ok(output.join('\n').includes('smoke: PASS'));
      assert.ok(output.join('\n').includes('security: PASS'));
      assert.ok(output.join('\n').includes('e2e: PASS'));
    } finally {
      cleanupTestDir(workspaceRoot);
      cleanupTestDir(cursorRoot);
    }
  })) passed++; else failed++;

  console.log('\n=== Test Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
