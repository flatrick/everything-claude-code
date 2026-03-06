/**
 * Tests for CI validator scripts (round/edge-case set)
 *
 * Run with: node tests/ci/validators-rounds-3.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { test, createTestDir, cleanupTestDir } = require('../helpers/test-runner');
const { runValidatorWithDir, runValidatorWithDirs } = require('../helpers/validator-test-utils');

function runTests() {
  console.log('\n=== Testing CI Validators (Round Cases) ===\n');

  let passed = 0;
  let failed = 0;

  console.log('\nRound 42: validate-agents (case sensitivity):');

  if (test('rejects uppercase model value (case-sensitive check)', () => {
    const testDir = createTestDir();
    fs.writeFileSync(path.join(testDir, 'upper.md'), '---\nmodel: Haiku\ntools: Read\n---\n# Uppercase model');

    const result = runValidatorWithDir('validate-agents', 'AGENTS_DIR', testDir);
    assert.strictEqual(result.code, 1, 'Should reject capitalized model');
    assert.ok(result.stderr.includes('Invalid model'), 'Should report invalid model');
    assert.ok(result.stderr.includes('Haiku'), 'Should show the rejected value');
    cleanupTestDir(testDir);
  })) passed++; else failed++;

  if (test('handles space before colon in frontmatter key', () => {
    const testDir = createTestDir();
    // "model : sonnet" — space before colon. extractFrontmatter uses indexOf(':') + trim()
    fs.writeFileSync(path.join(testDir, 'space.md'), '---\nmodel : sonnet\ntools : Read, Write\n---\n# Agent with space-colon');

    const result = runValidatorWithDir('validate-agents', 'AGENTS_DIR', testDir);
    assert.strictEqual(result.code, 0, 'Should accept space before colon (trim handles it)');
    cleanupTestDir(testDir);
  })) passed++; else failed++;

  console.log('\nRound 42: validate-commands (missing agents dir):');

  if (test('flags agent path references when AGENTS_DIR does not exist', () => {
    const testDir = createTestDir();
    const skillsDir = createTestDir();
    // AGENTS_DIR points to non-existent path → validAgents set stays empty
    fs.writeFileSync(path.join(testDir, 'cmd.md'), '# Command\nSee agents/planner.md for details.');

    const result = runValidatorWithDirs('validate-commands', {
      COMMANDS_DIR: testDir, AGENTS_DIR: '/nonexistent/agents-dir', SKILLS_DIR: skillsDir
    });
    assert.strictEqual(result.code, 1, 'Should fail when agents dir missing but agent referenced');
    assert.ok(result.stderr.includes('planner'), 'Should report the unresolvable agent reference');
    cleanupTestDir(testDir); cleanupTestDir(skillsDir);
  })) passed++; else failed++;

  console.log('\nRound 42: validate-hooks (empty matchers array):');

  if (test('accepts event type with empty matchers array', () => {
    const testDir = createTestDir();
    const hooksFile = path.join(testDir, 'hooks.json');
    fs.writeFileSync(hooksFile, JSON.stringify({
      hooks: {
        PreToolUse: []
      }
    }));

    const result = runValidatorWithDir('validate-hooks', 'HOOKS_FILE', hooksFile);
    assert.strictEqual(result.code, 0, 'Should accept empty matchers array');
    assert.ok(result.stdout.includes('Validated 0'), 'Should report 0 matchers');
    cleanupTestDir(testDir);
  })) passed++; else failed++;

  // ── Round 47: escape sequence and frontmatter edge cases ──
  console.log('\nRound 47: validate-hooks (inline JS escape sequences):');

  if (test('validates inline JS with mixed escape sequences (newline + escaped quote)', () => {
    const testDir = createTestDir();
    const hooksFile = path.join(testDir, 'hooks.json');
    // Command value after JSON parse: node -e "var a = \"ok\"\nconsole.log(a)"
    // Regex captures: var a = \"ok\"\nconsole.log(a)
    // After unescape chain: var a = "ok"\nconsole.log(a) (real newline) — valid JS
    fs.writeFileSync(hooksFile, JSON.stringify({
      hooks: {
        PreToolUse: [{ matcher: 'test', hooks: [{ type: 'command',
          command: 'node -e "var a = \\"ok\\"\\nconsole.log(a)"' }] }]
      }
    }));

    const result = runValidatorWithDir('validate-hooks', 'HOOKS_FILE', hooksFile);
    assert.strictEqual(result.code, 0, 'Should handle escaped quotes and newline separators');
    cleanupTestDir(testDir);
  })) passed++; else failed++;

  if (test('rejects inline JS with syntax error after unescaping', () => {
    const testDir = createTestDir();
    const hooksFile = path.join(testDir, 'hooks.json');
    // After unescape this becomes: var x = { — missing closing brace
    fs.writeFileSync(hooksFile, JSON.stringify({
      hooks: {
        PreToolUse: [{ matcher: 'test', hooks: [{ type: 'command',
          command: 'node -e "var x = {"' }] }]
      }
    }));

    const result = runValidatorWithDir('validate-hooks', 'HOOKS_FILE', hooksFile);
    assert.strictEqual(result.code, 1, 'Should reject JS syntax error after unescaping');
    assert.ok(result.stderr.includes('invalid inline JS'), 'Should report inline JS error');
    cleanupTestDir(testDir);
  })) passed++; else failed++;

  console.log('\nRound 47: validate-agents (frontmatter lines without colon):');

  if (test('silently ignores frontmatter line without colon', () => {
    const testDir = createTestDir();
    // Line "just some text" has no colon — should be skipped, not cause crash
    fs.writeFileSync(path.join(testDir, 'mixed.md'),
      '---\nmodel: sonnet\njust some text without colon\ntools: Read\n---\n# Agent');

    const result = runValidatorWithDir('validate-agents', 'AGENTS_DIR', testDir);
    assert.strictEqual(result.code, 0, 'Should ignore lines without colon in frontmatter');
    cleanupTestDir(testDir);
  })) passed++; else failed++;

  // ── Round 52: command inline backtick refs, workflow whitespace, code-only rules ──
  console.log('\nRound 52: validate-commands (inline backtick refs):');

  if (test('validates command refs inside inline backticks (not stripped by code block removal)', () => {
    const testDir = createTestDir();
    const agentsDir = createTestDir();
    const skillsDir = createTestDir();
    fs.writeFileSync(path.join(testDir, 'deploy.md'), '# Deploy\nDeploy the app.');
    // Inline backtick ref `/deploy` should be validated (only fenced blocks stripped)
    fs.writeFileSync(path.join(testDir, 'workflow.md'),
      '# Workflow\nFirst run `/deploy` to deploy the app.');

    const result = runValidatorWithDirs('validate-commands', {
      COMMANDS_DIR: testDir, AGENTS_DIR: agentsDir, SKILLS_DIR: skillsDir
    });
    assert.strictEqual(result.code, 0, 'Inline backtick command refs should be validated');
    cleanupTestDir(testDir); cleanupTestDir(agentsDir); cleanupTestDir(skillsDir);
  })) passed++; else failed++;

  console.log('\nRound 52: validate-commands (workflow whitespace):');

  if (test('validates workflow arrows with irregular whitespace', () => {
    const testDir = createTestDir();
    const agentsDir = createTestDir();
    const skillsDir = createTestDir();
    fs.writeFileSync(path.join(agentsDir, 'planner.md'), '# Planner');
    fs.writeFileSync(path.join(agentsDir, 'reviewer.md'), '# Reviewer');
    // Three workflow lines: no spaces, double spaces, tab-separated
    fs.writeFileSync(path.join(testDir, 'flow.md'),
      '# Workflow\n\nplanner->reviewer\nplanner  ->  reviewer');

    const result = runValidatorWithDirs('validate-commands', {
      COMMANDS_DIR: testDir, AGENTS_DIR: agentsDir, SKILLS_DIR: skillsDir
    });
    assert.strictEqual(result.code, 0, 'Workflow arrows with irregular whitespace should be valid');
    cleanupTestDir(testDir); cleanupTestDir(agentsDir); cleanupTestDir(skillsDir);
  })) passed++; else failed++;

  console.log('\nRound 52: validate-rules (code-only content):');

  if (test('fails rule file containing only a fenced code block (missing heading)', () => {
    const testDir = createTestDir();
    fs.writeFileSync(path.join(testDir, 'code-only.md'),
      '```javascript\nfunction example() {\n  return true;\n}\n```');

    const result = runValidatorWithDir('validate-rules', 'RULES_DIR', testDir);
    assert.strictEqual(result.code, 1, 'Rule with only code block should fail without heading');
    assert.ok(result.stderr.includes('Missing markdown heading'), 'Should report missing heading');
    cleanupTestDir(testDir);
  })) passed++; else failed++;

  // ── Round 57: readFileSync error path, statSync catch block, adjacent code blocks ──
  console.log('\nRound 57: validate-skills.js (SKILL.md is a directory — readFileSync error):');

  if (test('fails gracefully when SKILL.md is a directory instead of a file', () => {
    const testDir = createTestDir();
    const skillDir = path.join(testDir, 'dir-skill');
    fs.mkdirSync(skillDir);
    // Create SKILL.md as a DIRECTORY, not a file — existsSync returns true
    // but readFileSync throws EISDIR, exercising the catch block (lines 33-37)
    fs.mkdirSync(path.join(skillDir, 'SKILL.md'));

    const result = runValidatorWithDir('validate-skills', 'SKILLS_DIR', testDir);
    assert.strictEqual(result.code, 1, 'Should fail when SKILL.md is a directory');
    assert.ok(result.stderr.includes('dir-skill'), 'Should report the problematic skill');
    cleanupTestDir(testDir);
  })) passed++; else failed++;

  console.log('\nRound 57: validate-rules.js (broken symlink — statSync catch block):');

  if (test('reports error for broken symlink .md file in rules directory', () => {
    const testDir = createTestDir();
    // Create a valid rule first
    fs.writeFileSync(path.join(testDir, 'valid.md'), '# Valid Rule');
    // Create a broken symlink (dangling → target doesn't exist)
    // statSync follows symlinks and throws ENOENT, exercising catch (lines 35-38)
    try {
      fs.symlinkSync('/nonexistent/target.md', path.join(testDir, 'broken.md'));
    } catch {
      // Skip on systems that don't support symlinks
      console.log('    (skipped — symlinks not supported)');
      cleanupTestDir(testDir);
      return;
    }

    const result = runValidatorWithDir('validate-rules', 'RULES_DIR', testDir);
    assert.strictEqual(result.code, 1, 'Should fail on broken symlink');
    assert.ok(result.stderr.includes('broken.md'), 'Should report the broken symlink file');
    cleanupTestDir(testDir);
  })) passed++; else failed++;

  console.log('\nRound 57: validate-commands.js (adjacent code blocks both stripped):');

  if (test('strips multiple adjacent code blocks before checking references', () => {
    const testDir = createTestDir();
    const agentsDir = createTestDir();
    const skillsDir = createTestDir();
    // Two adjacent code blocks, each with broken refs — BOTH must be stripped
    fs.writeFileSync(path.join(testDir, 'multi-blocks.md'),
      '# Multi Block\n\n' +
      '```\n`/phantom-a` in first block\n```\n\n' +
      'Content between blocks\n\n' +
      '```\n`/phantom-b` in second block\nagents/ghost-agent.md\n```\n\n' +
      'Final content');

    const result = runValidatorWithDirs('validate-commands', {
      COMMANDS_DIR: testDir, AGENTS_DIR: agentsDir, SKILLS_DIR: skillsDir
    });
    assert.strictEqual(result.code, 0,
      'Both code blocks should be stripped — no broken refs reported');
    assert.ok(!result.stderr.includes('phantom-a'), 'First block ref should be stripped');
    assert.ok(!result.stderr.includes('phantom-b'), 'Second block ref should be stripped');
    assert.ok(!result.stderr.includes('ghost-agent'), 'Agent ref in second block should be stripped');
    cleanupTestDir(testDir); cleanupTestDir(agentsDir); cleanupTestDir(skillsDir);
  })) passed++; else failed++;

  // ── Round 58: readFileSync catch block, colonIdx edge case, command-as-object ──
  console.log('\nRound 58: validate-agents.js (unreadable agent file — readFileSync catch):');

  if (test('reports error when agent .md file is unreadable (chmod 000)', () => {
    // Skip on Windows or when running as root (permissions won't work)
    if (process.platform === 'win32' || (process.getuid && process.getuid() === 0)) {
      console.log('    (skipped — not supported on this platform)');
      return;
    }
    const testDir = createTestDir();
    const agentFile = path.join(testDir, 'locked.md');
    fs.writeFileSync(agentFile, '---\nmodel: sonnet\ntools: Read\n---\n# Agent');
    fs.chmodSync(agentFile, 0o000);

    try {
      const result = runValidatorWithDir('validate-agents', 'AGENTS_DIR', testDir);
      assert.strictEqual(result.code, 1, 'Should exit 1 on read error');
      assert.ok(result.stderr.includes('locked.md'), 'Should mention the unreadable file');
    } finally {
      fs.chmodSync(agentFile, 0o644);
      cleanupTestDir(testDir);
    }
  })) passed++; else failed++;

  console.log('\nRound 58: validate-agents.js (frontmatter line with colon at position 0):');

  if (test('rejects agent when required field key has colon at position 0 (no key name)', () => {
    const testDir = createTestDir();
    fs.writeFileSync(path.join(testDir, 'bad-colon.md'),
      '---\n:sonnet\ntools: Read\n---\n# Agent with leading colon');

    const result = runValidatorWithDir('validate-agents', 'AGENTS_DIR', testDir);
    assert.strictEqual(result.code, 1, 'Should fail — model field is missing (colon at idx 0 skipped)');
    assert.ok(result.stderr.includes('model'), 'Should report missing model field');
    cleanupTestDir(testDir);
  })) passed++; else failed++;

  console.log('\nRound 58: validate-hooks.js (command is a plain object — not string or array):');

  if (test('rejects hook entry where command is a plain object', () => {
    const testDir = createTestDir();
    const hooksFile = path.join(testDir, 'hooks.json');
    fs.writeFileSync(hooksFile, JSON.stringify({
      hooks: {
        PreToolUse: [{ matcher: 'test', hooks: [{ type: 'command', command: { run: 'echo hi' } }] }]
      }
    }));

    const result = runValidatorWithDir('validate-hooks', 'HOOKS_FILE', hooksFile);
    assert.strictEqual(result.code, 1, 'Should reject object command (not string or array)');
    assert.ok(result.stderr.includes('command'), 'Should report invalid command field');
    cleanupTestDir(testDir);
  })) passed++; else failed++;

  // ── Round 63: object-format missing matcher, unreadable command file, empty commands dir ──
  // Summary
  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();

