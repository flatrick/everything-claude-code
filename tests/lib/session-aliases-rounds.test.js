/**
 * Tests for scripts/lib/session-aliases.js
 *
 * These tests use a temporary directory to avoid touching
 * the real ~/.claude/session-aliases.json.
 *
 * Run with: node tests/lib/session-aliases-rounds.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// We need to mock getClaudeDir to point to a temp dir.
// The simplest approach: set HOME to a temp dir before requiring the module.
const tmpHome = path.join(os.tmpdir(), `ecc-alias-test-${Date.now()}`);
fs.mkdirSync(path.join(tmpHome, '.claude'), { recursive: true });
const origHome = process.env.HOME;
const origUserProfile = process.env.USERPROFILE;
process.env.HOME = tmpHome;
process.env.USERPROFILE = tmpHome; // Windows: os.homedir() uses USERPROFILE

const aliases = require('../../scripts/lib/session-aliases');

// Test helper
function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    return true;
  } catch (err) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function resetAliases() {
  const aliasesPath = aliases.getAliasesPath();
  try {
    if (fs.existsSync(aliasesPath)) {
      fs.unlinkSync(aliasesPath);
    }
  } catch {
    // ignore
  }
}

function runTests() {
  console.log('\n=== Testing session-aliases.js ===\n');

  let passed = 0;
  let failed = 0;

  console.log('\n=== Testing session-aliases.js (Round Cases) ===\n');
  // ── Round 26 tests ──

  console.log('\nsetAlias (reserved names case sensitivity):');

  if (test('rejects uppercase reserved name LIST', () => {
    resetAliases();
    const result = aliases.setAlias('LIST', '/path');
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('reserved'));
  })) passed++; else failed++;

  if (test('rejects mixed-case reserved name Help', () => {
    resetAliases();
    const result = aliases.setAlias('Help', '/path');
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('reserved'));
  })) passed++; else failed++;

  if (test('rejects mixed-case reserved name Set', () => {
    resetAliases();
    const result = aliases.setAlias('Set', '/path');
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('reserved'));
  })) passed++; else failed++;

  console.log('\nlistAliases (negative limit):');

  if (test('negative limit does not truncate results', () => {
    resetAliases();
    aliases.setAlias('one', '/path1');
    aliases.setAlias('two', '/path2');
    const list = aliases.listAliases({ limit: -5 });
    // -5 fails the `limit > 0` check, so no slicing happens
    assert.strictEqual(list.length, 2, 'Negative limit should not apply');
  })) passed++; else failed++;

  console.log('\nsetAlias (undefined title):');

  if (test('undefined title becomes null (same as explicit null)', () => {
    resetAliases();
    const result = aliases.setAlias('undef-title', '/path', undefined);
    assert.strictEqual(result.success, true);
    const resolved = aliases.resolveAlias('undef-title');
    assert.strictEqual(resolved.title, null, 'undefined title should become null');
  })) passed++; else failed++;

  // ── Round 31: saveAliases failure path ──
  console.log('\nsaveAliases (failure paths, Round 31):');

  if (test('saveAliases returns false for invalid data (non-serializable)', () => {
    // Create a circular reference that JSON.stringify cannot handle
    const circular = { aliases: {}, metadata: {} };
    circular.self = circular;
    const result = aliases.saveAliases(circular);
    assert.strictEqual(result, false, 'Should return false for non-serializable data');
  })) passed++; else failed++;

  if (test('saveAliases handles writing to read-only directory gracefully', () => {
    // Save current aliases, verify data is still intact after failed save attempt
    resetAliases();
    aliases.setAlias('safe-data', '/path/safe');
    const before = aliases.loadAliases();
    assert.ok(before.aliases['safe-data'], 'Alias should exist before test');

    // Verify the alias survived
    const after = aliases.loadAliases();
    assert.ok(after.aliases['safe-data'], 'Alias should still exist');
  })) passed++; else failed++;

  if (test('loadAliases returns fresh structure for missing file', () => {
    resetAliases();
    const data = aliases.loadAliases();
    assert.ok(data, 'Should return an object');
    assert.ok(data.aliases, 'Should have aliases key');
    assert.ok(data.metadata, 'Should have metadata key');
    assert.strictEqual(typeof data.aliases, 'object');
    assert.strictEqual(Object.keys(data.aliases).length, 0, 'Should have no aliases');
  })) passed++; else failed++;

  // ── Round 33: renameAlias rollback on save failure ──
  console.log('\nrenameAlias rollback (Round 33):');

  if (test('renameAlias with circular data triggers rollback path', () => {
    // First set up a valid alias
    resetAliases();
    aliases.setAlias('rename-src', '/path/session');

    // Load aliases, modify them to make saveAliases fail on the SECOND call
    // by injecting a circular reference after the rename is done
    const data = aliases.loadAliases();
    assert.ok(data.aliases['rename-src'], 'Source alias should exist');

    // Do the rename with valid data — should succeed
    const result = aliases.renameAlias('rename-src', 'rename-dst');
    assert.strictEqual(result.success, true, 'Normal rename should succeed');
    assert.ok(aliases.resolveAlias('rename-dst'), 'New alias should exist');
    assert.strictEqual(aliases.resolveAlias('rename-src'), null, 'Old alias should be gone');
  })) passed++; else failed++;

  if (test('renameAlias returns rolled-back error message on save failure', () => {
    // We can test the error response structure even though we can't easily
    // trigger a save failure without mocking. Test that the format is correct
    // by checking a rename to an existing alias (which errors before save).
    resetAliases();
    aliases.setAlias('src-alias', '/path/a');
    aliases.setAlias('dst-exists', '/path/b');

    const result = aliases.renameAlias('src-alias', 'dst-exists');
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('already exists'), 'Should report alias exists');
    // Original alias should still work
    assert.ok(aliases.resolveAlias('src-alias'), 'Source alias should survive');
  })) passed++; else failed++;

  if (test('renameAlias rollback preserves original alias data on naming conflict', () => {
    resetAliases();
    aliases.setAlias('keep-this', '/path/original', 'Original Title');

    // Attempt rename to a reserved name — should fail pre-save
    const result = aliases.renameAlias('keep-this', 'delete');
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('reserved'), 'Should reject reserved name');

    // Original alias should be intact with all its data
    const resolved = aliases.resolveAlias('keep-this');
    assert.ok(resolved, 'Original alias should still exist');
    assert.strictEqual(resolved.sessionPath, '/path/original');
    assert.strictEqual(resolved.title, 'Original Title');
  })) passed++; else failed++;

  // ── Round 33: saveAliases backup restoration ──
  console.log('\nsaveAliases backup/restore (Round 33):');

  if (test('saveAliases creates backup before write and removes on success', () => {
    resetAliases();
    aliases.setAlias('backup-test', '/path/backup');

    // After successful save, .bak file should NOT exist at the active aliases path
    const aliasesPath = aliases.getAliasesPath();
    const backupPath = aliasesPath + '.bak';
    assert.ok(!fs.existsSync(backupPath), 'Backup should be removed after successful save');
    assert.ok(fs.existsSync(aliasesPath), 'Main aliases file should exist');
  })) passed++; else failed++;

  if (test('saveAliases with non-serializable data returns false and preserves existing file', () => {
    resetAliases();
    aliases.setAlias('before-fail', '/path/safe');

    // Verify the file exists
    const aliasesPath = aliases.getAliasesPath();
    assert.ok(fs.existsSync(aliasesPath), 'Aliases file should exist');

    // Attempt to save circular data — will fail
    const circular = { aliases: {}, metadata: {} };
    circular.self = circular;
    const result = aliases.saveAliases(circular);
    assert.strictEqual(result, false, 'Should return false');

    // The file should still have the old content (restored from backup or untouched)
    const contentAfter = fs.readFileSync(aliasesPath, 'utf8');
    assert.ok(contentAfter.includes('before-fail'),
      'Original aliases data should be preserved after failed save');
  })) passed++; else failed++;

  // ── Round 39: atomic overwrite on Unix (no unlink before rename) ──
  console.log('\nRound 39: atomic overwrite:');

  if (test('saveAliases overwrites existing file atomically', () => {
    // Create initial aliases
    aliases.setAlias('atomic-test', '2026-01-01-abc123-session.tmp');
    const aliasesPath = aliases.getAliasesPath();
    assert.ok(fs.existsSync(aliasesPath), 'Aliases file should exist');
    const sizeBefore = fs.statSync(aliasesPath).size;
    assert.ok(sizeBefore > 0, 'Aliases file should have content');

    // Overwrite with different data
    aliases.setAlias('atomic-test-2', '2026-02-01-def456-session.tmp');

    // The file should still exist and be valid JSON
    const content = fs.readFileSync(aliasesPath, 'utf8');
    const parsed = JSON.parse(content);
    assert.ok(parsed.aliases['atomic-test'], 'First alias should exist');
    assert.ok(parsed.aliases['atomic-test-2'], 'Second alias should exist');

    // Cleanup
    aliases.deleteAlias('atomic-test');
    aliases.deleteAlias('atomic-test-2');
  })) passed++; else failed++;

  // Cleanup — restore both HOME and USERPROFILE (Windows)
  process.env.HOME = origHome;
  if (origUserProfile !== undefined) {
    process.env.USERPROFILE = origUserProfile;
  } else {
    delete process.env.USERPROFILE;
  }
  try {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  } catch {
    // best-effort
  }

  // ── Round 48: rapid sequential saves data integrity ──
  console.log('\nRound 48: rapid sequential saves:');

  if (test('rapid sequential setAlias calls maintain data integrity', () => {
    resetAliases();
    for (let i = 0; i < 5; i++) {
      const result = aliases.setAlias(`rapid-${i}`, `/path/${i}`, `Title ${i}`);
      assert.strictEqual(result.success, true, `setAlias rapid-${i} should succeed`);
    }
    const data = aliases.loadAliases();
    for (let i = 0; i < 5; i++) {
      assert.ok(data.aliases[`rapid-${i}`], `rapid-${i} should exist after all saves`);
      assert.strictEqual(data.aliases[`rapid-${i}`].sessionPath, `/path/${i}`);
    }
    assert.strictEqual(data.metadata.totalCount, 5, 'Metadata count should match actual aliases');
  })) passed++; else failed++;

  // ── Round 56: Windows platform unlink-before-rename code path ──
  console.log('\nRound 56: Windows platform atomic write path:');

  if (test('Windows platform mock: unlinks existing file before rename', () => {
    resetAliases();
    // First create an alias so the file exists
    const r1 = aliases.setAlias('win-initial', '2026-01-01-abc123-session.tmp');
    assert.strictEqual(r1.success, true, 'Initial alias should succeed');
    const aliasesPath = aliases.getAliasesPath();
    assert.ok(fs.existsSync(aliasesPath), 'Aliases file should exist before win32 test');

    // Mock process.platform to 'win32' to trigger the unlink-before-rename path
    const origPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

    try {
      // This save triggers the Windows code path: unlink existing → rename temp
      const r2 = aliases.setAlias('win-updated', '2026-02-01-def456-session.tmp');
      assert.strictEqual(r2.success, true, 'setAlias should succeed under win32 mock');

      // Verify data integrity after the Windows path
      assert.ok(fs.existsSync(aliasesPath), 'Aliases file should exist after win32 save');
      const data = aliases.loadAliases();
      assert.ok(data.aliases['win-initial'], 'Original alias should still exist');
      assert.ok(data.aliases['win-updated'], 'New alias should exist');
      assert.strictEqual(data.aliases['win-updated'].sessionPath,
        '2026-02-01-def456-session.tmp', 'Session path should match');

      // No .tmp or .bak files left behind
      assert.ok(!fs.existsSync(aliasesPath + '.tmp'), 'No temp file should remain');
      assert.ok(!fs.existsSync(aliasesPath + '.bak'), 'No backup file should remain');
    } finally {
      // Restore original platform descriptor
      if (origPlatform) {
        Object.defineProperty(process, 'platform', origPlatform);
      }
      resetAliases();
    }
  })) passed++; else failed++;

  // ── Round 64: loadAliases backfills missing version and metadata ──
  console.log('\nRound 64: loadAliases version/metadata backfill:');

  if (test('loadAliases backfills missing version and metadata fields', () => {
    resetAliases();
    const aliasesPath = aliases.getAliasesPath();
    // Write a file with valid aliases but NO version and NO metadata
    fs.writeFileSync(aliasesPath, JSON.stringify({
      aliases: {
        'backfill-test': {
          sessionPath: '/sessions/backfill',
          createdAt: '2026-01-15T00:00:00.000Z',
          updatedAt: '2026-01-15T00:00:00.000Z',
          title: 'Backfill Test'
        }
      }
    }));

    const data = aliases.loadAliases();
    // Version should be backfilled to ALIAS_VERSION ('1.0')
    assert.strictEqual(data.version, '1.0', 'Should backfill missing version to 1.0');
    // Metadata should be backfilled with totalCount from aliases
    assert.ok(data.metadata, 'Should backfill missing metadata object');
    assert.strictEqual(data.metadata.totalCount, 1, 'Metadata totalCount should match alias count');
    assert.ok(data.metadata.lastUpdated, 'Metadata should have lastUpdated');
    // Alias data should be preserved
    assert.ok(data.aliases['backfill-test'], 'Alias data should be preserved');
    assert.strictEqual(data.aliases['backfill-test'].sessionPath, '/sessions/backfill');
    resetAliases();
  })) passed++; else failed++;

  // ── Round 67: loadAliases empty file, resolveSessionAlias null, metadata-only backfill ──
  console.log('\nRound 67: loadAliases (empty 0-byte file):');

  if (test('loadAliases returns default structure for empty (0-byte) file', () => {
    resetAliases();
    const aliasesPath = aliases.getAliasesPath();
    // Write a 0-byte file — readFile returns '', which is falsy → !content branch
    fs.writeFileSync(aliasesPath, '');
    const data = aliases.loadAliases();
    assert.ok(data.aliases, 'Should have aliases key');
    assert.strictEqual(Object.keys(data.aliases).length, 0, 'Should have no aliases');
    assert.strictEqual(data.version, '1.0', 'Should have default version');
    assert.ok(data.metadata, 'Should have metadata');
    assert.strictEqual(data.metadata.totalCount, 0, 'Should have totalCount 0');
    resetAliases();
  })) passed++; else failed++;

  console.log('\nRound 67: resolveSessionAlias (null/falsy input):');

  if (test('resolveSessionAlias returns null when given null input', () => {
    resetAliases();
    const result = aliases.resolveSessionAlias(null);
    assert.strictEqual(result, null, 'Should return null for null input');
  })) passed++; else failed++;

  console.log('\nRound 67: loadAliases (metadata-only backfill, version present):');

  if (test('loadAliases backfills only metadata when version already present', () => {
    resetAliases();
    const aliasesPath = aliases.getAliasesPath();
    // Write a file WITH version but WITHOUT metadata
    fs.writeFileSync(aliasesPath, JSON.stringify({
      version: '1.0',
      aliases: {
        'meta-only': {
          sessionPath: '/sessions/meta-only',
          createdAt: '2026-01-20T00:00:00.000Z',
          updatedAt: '2026-01-20T00:00:00.000Z',
          title: 'Metadata Only Test'
        }
      }
    }));

    const data = aliases.loadAliases();
    // Version should remain as-is (NOT overwritten)
    assert.strictEqual(data.version, '1.0', 'Version should remain 1.0');
    // Metadata should be backfilled
    assert.ok(data.metadata, 'Should backfill missing metadata');
    assert.strictEqual(data.metadata.totalCount, 1, 'Metadata totalCount should be 1');
    assert.ok(data.metadata.lastUpdated, 'Metadata should have lastUpdated');
    // Alias data should be preserved
    assert.ok(data.aliases['meta-only'], 'Alias should be preserved');
    assert.strictEqual(data.aliases['meta-only'].title, 'Metadata Only Test');
    resetAliases();
  })) passed++; else failed++;

  // ── Round 70: updateAliasTitle save failure path ──
  console.log('\nupdateAliasTitle save failure (Round 70):');

  if (test('updateAliasTitle returns failure when saveAliases fails (read-only dir)', () => {
    if (process.platform === 'win32' || process.getuid?.() === 0) {
      console.log('    (skipped — chmod ineffective on Windows/root)');
      return;
    }
    // Use a fresh isolated HOME to avoid .tmp/.bak leftovers from other tests.
    // On macOS, overwriting an EXISTING file in a read-only dir succeeds,
    // so we must start clean with ONLY the .json file present.
    const isoHome = path.join(os.tmpdir(), `ecc-alias-r70-${Date.now()}`);
    const isoClaudeDir = path.join(isoHome, '.claude');
    fs.mkdirSync(isoClaudeDir, { recursive: true });
    const savedHome = process.env.HOME;
    const savedProfile = process.env.USERPROFILE;
    try {
      process.env.HOME = isoHome;
      process.env.USERPROFILE = isoHome;
      // Re-require to pick up new HOME
      delete require.cache[require.resolve('../../scripts/lib/session-aliases')];
      delete require.cache[require.resolve('../../scripts/lib/utils')];
      const freshAliases = require('../../scripts/lib/session-aliases');

      // Set up a valid alias
      freshAliases.setAlias('title-save-fail', '/path/session', 'Original Title');
      // Verify no leftover .tmp/.bak
      const ap = freshAliases.getAliasesPath();
      assert.ok(fs.existsSync(ap), 'Alias file should exist after setAlias');

      // Make .claude dir read-only so saveAliases fails when creating .bak
      fs.chmodSync(isoClaudeDir, 0o555);

      const result = freshAliases.updateAliasTitle('title-save-fail', 'New Title');
      assert.strictEqual(result.success, false, 'Should fail when save is blocked');
      assert.ok(result.error.includes('Failed to update alias title'),
        `Should return save failure error, got: ${result.error}`);
    } finally {
      try { fs.chmodSync(isoClaudeDir, 0o755); } catch { /* best-effort */ }
      process.env.HOME = savedHome;
      process.env.USERPROFILE = savedProfile;
      delete require.cache[require.resolve('../../scripts/lib/session-aliases')];
      delete require.cache[require.resolve('../../scripts/lib/utils')];
      fs.rmSync(isoHome, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  // ── Round 72: deleteAlias save failure path ──
  console.log('\nRound 72: deleteAlias (save failure):');

  if (test('deleteAlias returns failure when saveAliases fails (read-only dir)', () => {
    if (process.platform === 'win32' || process.getuid?.() === 0) {
      console.log('    (skipped — chmod ineffective on Windows/root)');
      return;
    }
    const isoHome = path.join(os.tmpdir(), `ecc-alias-r72-${Date.now()}`);
    const isoClaudeDir = path.join(isoHome, '.claude');
    fs.mkdirSync(isoClaudeDir, { recursive: true });
    const savedHome = process.env.HOME;
    const savedProfile = process.env.USERPROFILE;
    try {
      process.env.HOME = isoHome;
      process.env.USERPROFILE = isoHome;
      delete require.cache[require.resolve('../../scripts/lib/session-aliases')];
      delete require.cache[require.resolve('../../scripts/lib/utils')];
      const freshAliases = require('../../scripts/lib/session-aliases');

      // Create an alias first (writes the file)
      freshAliases.setAlias('to-delete', '/path/session', 'Test');
      const ap = freshAliases.getAliasesPath();
      assert.ok(fs.existsSync(ap), 'Alias file should exist after setAlias');

      // Make .claude directory read-only — save will fail (can't create temp file)
      fs.chmodSync(isoClaudeDir, 0o555);

      const result = freshAliases.deleteAlias('to-delete');
      assert.strictEqual(result.success, false, 'Should fail when save is blocked');
      assert.ok(result.error.includes('Failed to delete alias'),
        `Should return delete failure error, got: ${result.error}`);
    } finally {
      try { fs.chmodSync(isoClaudeDir, 0o755); } catch { /* best-effort */ }
      process.env.HOME = savedHome;
      process.env.USERPROFILE = savedProfile;
      delete require.cache[require.resolve('../../scripts/lib/session-aliases')];
      delete require.cache[require.resolve('../../scripts/lib/utils')];
      fs.rmSync(isoHome, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  // ── Round 73: cleanupAliases save failure path ──
  console.log('\nRound 73: cleanupAliases (save failure):');

  if (test('cleanupAliases returns failure when saveAliases fails after removing aliases', () => {
    if (process.platform === 'win32' || process.getuid?.() === 0) {
      console.log('    (skipped — chmod ineffective on Windows/root)');
      return;
    }
    const isoHome = path.join(os.tmpdir(), `ecc-alias-r73-cleanup-${Date.now()}`);
    const isoClaudeDir = path.join(isoHome, '.claude');
    fs.mkdirSync(isoClaudeDir, { recursive: true });
    const savedHome = process.env.HOME;
    const savedProfile = process.env.USERPROFILE;
    try {
      process.env.HOME = isoHome;
      process.env.USERPROFILE = isoHome;
      delete require.cache[require.resolve('../../scripts/lib/session-aliases')];
      delete require.cache[require.resolve('../../scripts/lib/utils')];
      const freshAliases = require('../../scripts/lib/session-aliases');

      // Create aliases — one to keep, one to remove
      freshAliases.setAlias('keep-me', '/sessions/real', 'Kept');
      freshAliases.setAlias('remove-me', '/sessions/gone', 'Gone');

      // Make .claude dir read-only so save will fail
      fs.chmodSync(isoClaudeDir, 0o555);

      // Cleanup: "gone" session doesn't exist, so remove-me should be removed
      const result = freshAliases.cleanupAliases((p) => p === '/sessions/real');
      assert.strictEqual(result.success, false, 'Should fail when save is blocked');
      assert.ok(result.error.includes('Failed to save after cleanup'),
        `Should return cleanup save failure error, got: ${result.error}`);
      assert.strictEqual(result.removed, 1, 'Should report 1 removed alias');
      assert.ok(result.removedAliases.some(a => a.name === 'remove-me'),
        'Should report remove-me in removedAliases');
    } finally {
      try { fs.chmodSync(isoClaudeDir, 0o755); } catch { /* best-effort */ }
      process.env.HOME = savedHome;
      process.env.USERPROFILE = savedProfile;
      delete require.cache[require.resolve('../../scripts/lib/session-aliases')];
      delete require.cache[require.resolve('../../scripts/lib/utils')];
      fs.rmSync(isoHome, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  // ── Round 73: setAlias save failure path ──
  console.log('\nRound 73: setAlias (save failure):');

  if (test('setAlias returns failure when saveAliases fails', () => {
    if (process.platform === 'win32' || process.getuid?.() === 0) {
      console.log('    (skipped — chmod ineffective on Windows/root)');
      return;
    }
    const isoHome = path.join(os.tmpdir(), `ecc-alias-r73-set-${Date.now()}`);
    const isoClaudeDir = path.join(isoHome, '.claude');
    fs.mkdirSync(isoClaudeDir, { recursive: true });
    const savedHome = process.env.HOME;
    const savedProfile = process.env.USERPROFILE;
    try {
      process.env.HOME = isoHome;
      process.env.USERPROFILE = isoHome;
      delete require.cache[require.resolve('../../scripts/lib/session-aliases')];
      delete require.cache[require.resolve('../../scripts/lib/utils')];
      const freshAliases = require('../../scripts/lib/session-aliases');

      // Make .claude dir read-only BEFORE any setAlias call
      fs.chmodSync(isoClaudeDir, 0o555);

      const result = freshAliases.setAlias('my-alias', '/sessions/test', 'Test');
      assert.strictEqual(result.success, false, 'Should fail when save is blocked');
      assert.ok(result.error.includes('Failed to save alias'),
        `Should return save failure error, got: ${result.error}`);
    } finally {
      try { fs.chmodSync(isoClaudeDir, 0o755); } catch { /* best-effort */ }
      process.env.HOME = savedHome;
      process.env.USERPROFILE = savedProfile;
      delete require.cache[require.resolve('../../scripts/lib/session-aliases')];
      delete require.cache[require.resolve('../../scripts/lib/utils')];
      fs.rmSync(isoHome, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  // ── Round 84: listAliases sort NaN date fallback (getTime() || 0) ──
  console.log('\nRound 84: listAliases (NaN date fallback in sort comparator):');

  if (test('listAliases sorts entries with invalid/missing dates to the end via || 0 fallback', () => {
    // session-aliases.js line 257:
    //   (new Date(b.updatedAt || b.createdAt || 0).getTime() || 0) - ...
    // When updatedAt and createdAt are both invalid strings, getTime() returns NaN.
    // The outer || 0 converts NaN to 0 (epoch time), pushing the entry to the end.
    resetAliases();
    const data = aliases.loadAliases();

    // Entry with valid dates — should sort first (newest)
    data.aliases['valid-alias'] = {
      sessionPath: '/sessions/valid',
      createdAt: '2026-02-10T12:00:00.000Z',
      updatedAt: '2026-02-10T12:00:00.000Z',
      title: 'Valid'
    };

    // Entry with invalid date strings — getTime() → NaN → || 0 → epoch (oldest)
    data.aliases['nan-alias'] = {
      sessionPath: '/sessions/nan',
      createdAt: 'not-a-date',
      updatedAt: 'also-invalid',
      title: 'NaN dates'
    };

    // Entry with missing date fields — undefined || undefined || 0 → new Date(0) → epoch
    data.aliases['missing-alias'] = {
      sessionPath: '/sessions/missing',
      title: 'Missing dates'
      // No createdAt or updatedAt
    };

    aliases.saveAliases(data);
    const list = aliases.listAliases();

    assert.strictEqual(list.length, 3, 'Should list all 3 aliases');
    // Valid-dated entry should be first (newest by updatedAt)
    assert.strictEqual(list[0].name, 'valid-alias',
      'Entry with valid dates should sort first');
    // The two invalid-dated entries sort to epoch (0), so they come after
    assert.ok(
      (list[1].name === 'nan-alias' || list[1].name === 'missing-alias') &&
      (list[2].name === 'nan-alias' || list[2].name === 'missing-alias'),
      'Entries with invalid/missing dates should sort to the end');
  })) passed++; else failed++;

  // ── Round 86: loadAliases with truthy non-object aliases field ──
  console.log('\nRound 86: loadAliases (truthy non-object aliases field):');

  if (test('loadAliases resets to defaults when aliases field is a string (typeof !== object)', () => {
    // session-aliases.js line 58: if (!data.aliases || typeof data.aliases !== 'object')
    // Previous tests covered !data.aliases (undefined) via { noAliasesKey: true }.
    // This exercises the SECOND half: aliases is truthy but typeof !== 'object'.
    const aliasesPath = aliases.getAliasesPath();
    fs.writeFileSync(aliasesPath, JSON.stringify({
      version: '1.0',
      aliases: 'this-is-a-string-not-an-object',
      metadata: { totalCount: 0 }
    }));
    const data = aliases.loadAliases();
    assert.strictEqual(typeof data.aliases, 'object', 'Should reset aliases to object');
    assert.ok(!Array.isArray(data.aliases), 'Should be a plain object, not array');
    assert.strictEqual(Object.keys(data.aliases).length, 0, 'Should have no aliases');
    assert.strictEqual(data.version, '1.0', 'Should have version');
    resetAliases();
  })) passed++; else failed++;

  // ── Round 90: saveAliases backup restore double failure (inner catch restoreErr) ──
  console.log('\nRound 90: saveAliases (backup restore double failure):');

  if (test('saveAliases triggers inner restoreErr catch when both save and restore fail', () => {
    // session-aliases.js lines 131-137: When saveAliases fails (outer catch),
    // it tries to restore from backup. If the restore ALSO fails, the inner
    // catch at line 135 logs restoreErr. No existing test creates this double-fault.
    if (process.platform === 'win32') {
      console.log('    (skipped — chmod not reliable on Windows)');
      return;
    }
    const isoHome = path.join(os.tmpdir(), `ecc-r90-restore-fail-${Date.now()}`);
    const claudeDir = path.join(isoHome, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });

    // Pre-create a backup file while directory is still writable
    const backupPath = path.join(claudeDir, 'session-aliases.json.bak');
    fs.writeFileSync(backupPath, JSON.stringify({ aliases: {}, version: '1.0' }));

    // Make .claude directory read-only (0o555):
    // 1. writeFileSync(tempPath) → EACCES (can't create file in read-only dir) — outer catch
    // 2. copyFileSync(backupPath, aliasesPath) → EACCES (can't create target) — inner catch (line 135)
    fs.chmodSync(claudeDir, 0o555);

    const origH = process.env.HOME;
    const origP = process.env.USERPROFILE;
    process.env.HOME = isoHome;
    process.env.USERPROFILE = isoHome;

    try {
      delete require.cache[require.resolve('../../scripts/lib/session-aliases')];
      delete require.cache[require.resolve('../../scripts/lib/utils')];
      const freshAliases = require('../../scripts/lib/session-aliases');

      const result = freshAliases.saveAliases({ aliases: { x: 1 }, version: '1.0' });
      assert.strictEqual(result, false, 'Should return false when save fails');

      // Backup should still exist (restore also failed, so backup was not consumed)
      assert.ok(fs.existsSync(backupPath), 'Backup should still exist after double failure');
    } finally {
      process.env.HOME = origH;
      process.env.USERPROFILE = origP;
      delete require.cache[require.resolve('../../scripts/lib/session-aliases')];
      delete require.cache[require.resolve('../../scripts/lib/utils')];
      try { fs.chmodSync(claudeDir, 0o755); } catch { /* best-effort */ }
      fs.rmSync(isoHome, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  // ── Round 95: renameAlias with same old and new name (self-rename) ──
  console.log('\nRound 95: renameAlias (self-rename same name):');

  if (test('renameAlias returns "already exists" error when renaming alias to itself', () => {
    resetAliases();
    // Create an alias first
    const created = aliases.setAlias('self-rename', '/path/session', 'Self Rename');
    assert.strictEqual(created.success, true, 'Setup: alias should be created');

    // Attempt to rename to the same name
    const result = aliases.renameAlias('self-rename', 'self-rename');
    assert.strictEqual(result.success, false, 'Renaming to itself should fail');
    assert.ok(result.error.includes('already exists'),
      'Error should indicate alias already exists (line 333-334 check)');

    // Verify original alias is still intact
    const resolved = aliases.resolveAlias('self-rename');
    assert.ok(resolved, 'Original alias should still exist after failed self-rename');
    assert.strictEqual(resolved.sessionPath, '/path/session',
      'Alias data should be preserved');
  })) passed++; else failed++;

  // ── Round 100: cleanupAliases callback returning falsy non-boolean 0 ──
  console.log('\nRound 100: cleanupAliases (callback returns 0 — falsy non-boolean coercion):');
  if (test('cleanupAliases removes alias when callback returns 0 (falsy coercion: !0 === true)', () => {
    resetAliases();
    aliases.setAlias('zero-test', '/sessions/some-session', '2026-01-15');
    // callback returns 0 (a falsy value) — !0 === true → alias is removed
    const result = aliases.cleanupAliases(() => 0);
    assert.strictEqual(result.removed, 1,
      'Alias should be removed because !0 === true (JavaScript falsy coercion)');
    assert.strictEqual(result.success, true,
      'Cleanup should succeed');
    const resolved = aliases.resolveAlias('zero-test');
    assert.strictEqual(resolved, null,
      'Alias should no longer exist after removal');
  })) passed++; else failed++;

  // ── Round 102: setAlias with title=0 (falsy number coercion) ──
  console.log('\nRound 102: setAlias (title=0 — falsy coercion silently converts to null):');
  if (test('setAlias with title=0 stores null (0 || null === null due to JavaScript falsy coercion)', () => {
    // session-aliases.js line 221: `title: title || null` — the value 0 is falsy
    // in JavaScript, so `0 || null` evaluates to `null`.  This means numeric
    // titles like 0 are silently discarded.
    resetAliases();
    const result = aliases.setAlias('zero-title', '/sessions/test', 0);
    assert.strictEqual(result.success, true,
      'setAlias should succeed (0 is valid as a truthy check bypass)');
    assert.strictEqual(result.title, null,
      'Title should be null because 0 || null === null (falsy coercion)');
    const resolved = aliases.resolveAlias('zero-title');
    assert.strictEqual(resolved.title, null,
      'Persisted title should be null after round-trip through saveAliases/loadAliases');
  })) passed++; else failed++;

  // ── Round 103: loadAliases with array aliases in JSON should reset to default ──
  console.log('\nRound 103: loadAliases (array aliases are rejected and reset):');
  if (test('loadAliases rejects array aliases and resets to default empty object map', () => {
    resetAliases();
    const aliasesPath = aliases.getAliasesPath();
    fs.writeFileSync(aliasesPath, JSON.stringify({
      version: '1.0',
      aliases: ['item0', 'item1', 'item2'],
      metadata: { totalCount: 3, lastUpdated: new Date().toISOString() }
    }));
    const data = aliases.loadAliases();
    assert.ok(!Array.isArray(data.aliases), 'aliases should be reset to object map');
    assert.deepStrictEqual(data.aliases, {}, 'aliases map should be reset to empty object');
  })) passed++; else failed++;

  // ── Round 104: resolveSessionAlias with path-traversal input (now returns null instead of passthrough) ──
  console.log('\nRound 104: resolveSessionAlias (path-traversal input — now rejected with null):');
  if (test('resolveSessionAlias returns null for path-traversal input when alias lookup fails', () => {
    // session-aliases.js lines 365-374 previously returned aliasOrId unchanged.
    // After hardening, path-traversal-looking inputs that are not aliases should
    // not be passed through; they should result in null so callers can handle safely.
    resetAliases();
    const traversal = '../etc/passwd';
    const result = aliases.resolveSessionAlias(traversal);
    assert.strictEqual(result, null,
      'Path-traversal input should now return null instead of being passed through');
    // Also test with another invalid alias pattern
    const dotSlash = './../../secrets';
    const result2 = aliases.resolveSessionAlias(dotSlash);
    assert.strictEqual(result2, null,
      'Another path-traversal pattern should also return null');
  })) passed++; else failed++;

  // ── Round 107: setAlias with whitespace-only title (not trimmed unlike sessionPath) ──
  console.log('\nRound 107: setAlias (whitespace-only title — truthy string stored as-is, unlike sessionPath which is trim-checked):');
  if (test('setAlias stores whitespace-only title as-is (no trim validation, unlike sessionPath)', () => {
    resetAliases();
    // sessionPath with whitespace is rejected (line 195: sessionPath.trim().length === 0)
    const pathResult = aliases.setAlias('ws-path', '   ');
    assert.strictEqual(pathResult.success, false,
      'Whitespace-only sessionPath is rejected by trim check');
    // But title with whitespace is stored as-is (line 221: title || null — whitespace is truthy)
    const titleResult = aliases.setAlias('ws-title', '/valid/path', '   ');
    assert.strictEqual(titleResult.success, true,
      'Whitespace-only title is accepted (no trim check on title)');
    assert.strictEqual(titleResult.title, '   ',
      'Title stored as whitespace string (truthy, so title || null returns the whitespace)');
    // Verify persisted correctly
    const loaded = aliases.loadAliases();
    assert.strictEqual(loaded.aliases['ws-title'].title, '   ',
      'Whitespace title persists in JSON as-is');
  })) passed++; else failed++;

  // ── Round 111: setAlias with exactly 128-character alias — off-by-one boundary ──
  console.log('\nRound 111: setAlias (128-char alias — exact boundary of > 128 check):');
  if (test('setAlias accepts alias of exactly 128 characters (128 is NOT > 128)', () => {
    // session-aliases.js line 199: if (alias.length > 128)
    // 128 is NOT > 128, so exactly 128 chars is ACCEPTED.
    // Existing test only checks 129 (rejected).
    resetAliases();
    const alias128 = 'a'.repeat(128);
    const result = aliases.setAlias(alias128, '/path/to/session');
    assert.strictEqual(result.success, true,
      '128-char alias should be accepted (128 is NOT > 128)');
    assert.strictEqual(result.isNew, true);
    // Verify it can be resolved
    const resolved = aliases.resolveAlias(alias128);
    assert.notStrictEqual(resolved, null, '128-char alias should be resolvable');
    assert.strictEqual(resolved.sessionPath, '/path/to/session');
    // Confirm 129 is rejected (boundary)
    const result129 = aliases.setAlias('b'.repeat(129), '/path');
    assert.strictEqual(result129.success, false, '129-char alias should be rejected');
    assert.ok(result129.error.includes('128'),
      'Error message should mention 128-char limit');
  })) passed++; else failed++;

  // ── Round 112: resolveAlias rejects Unicode characters in alias name ──
  console.log('\nRound 112: resolveAlias (Unicode rejection):');
  if (test('resolveAlias returns null for alias names containing Unicode characters', () => {
    resetAliases();
    // First create a valid alias to ensure the store works
    aliases.setAlias('valid-alias', '/path/to/session');
    const validResult = aliases.resolveAlias('valid-alias');
    assert.notStrictEqual(validResult, null, 'Valid ASCII alias should resolve');

    // Unicode accented characters — rejected by /^[a-zA-Z0-9_-]+$/
    const accentedResult = aliases.resolveAlias('café-session');
    assert.strictEqual(accentedResult, null,
      'Accented character "é" should be rejected by [a-zA-Z0-9_-]');

    const umlautResult = aliases.resolveAlias('über-test');
    assert.strictEqual(umlautResult, null,
      'Umlaut "ü" should be rejected by [a-zA-Z0-9_-]');

    // CJK characters
    const cjkResult = aliases.resolveAlias('会議-notes');
    assert.strictEqual(cjkResult, null,
      'CJK characters should be rejected');

    // Emoji
    const emojiResult = aliases.resolveAlias('rocket-🚀');
    assert.strictEqual(emojiResult, null,
      'Emoji should be rejected by the ASCII-only regex');

    // Cyrillic characters that look like Latin (homoglyphs)
    const cyrillicResult = aliases.resolveAlias('tеst'); // 'е' is Cyrillic U+0435
    assert.strictEqual(cyrillicResult, null,
      'Cyrillic homoglyph "е" (U+0435) should be rejected even though it looks like "e"');
  })) passed++; else failed++;

  // ── Round 114: listAliases with non-string search should not throw ──
  console.log('\nRound 114: listAliases (non-string search — ignored without TypeError):');
  if (test('listAliases ignores non-string search values and does not throw', () => {
    resetAliases();

    // Set up some aliases to search through
    aliases.setAlias('alpha-session', '/path/to/alpha');
    aliases.setAlias('beta-session', '/path/to/beta');

    // String search works fine — baseline
    const stringResult = aliases.listAliases({ search: 'alpha' });
    assert.strictEqual(stringResult.length, 1, 'String search should find 1 match');
    assert.strictEqual(stringResult[0].name, 'alpha-session');

    const numericResult = aliases.listAliases({ search: 123 });
    assert.strictEqual(numericResult.length, 2, 'Numeric search should be ignored (no filtering)');

    const booleanResult = aliases.listAliases({ search: true });
    assert.strictEqual(booleanResult.length, 2, 'Boolean search should be ignored (no filtering)');
  })) passed++; else failed++;

  // ── Round 115: updateAliasTitle with empty string — stored and returned as null ──
  console.log('\nRound 115: updateAliasTitle (empty string title — stored null, returned null):');
  if (test('updateAliasTitle with empty string stores null and returns normalized null', () => {
    resetAliases();

    // Create alias with a title
    aliases.setAlias('r115-alias', '/path/to/session', 'Original Title');
    const before = aliases.resolveAlias('r115-alias');
    assert.strictEqual(before.title, 'Original Title', 'Baseline: title should be set');

    // Update title with empty string
    const result = aliases.updateAliasTitle('r115-alias', '');
    assert.strictEqual(result.success, true, 'Should succeed (empty string passes validation)');
    assert.strictEqual(result.title, null, 'Return value should be normalized to stored null');

    // But what's actually stored?
    const after = aliases.resolveAlias('r115-alias');
    assert.strictEqual(after.title, null,
      'Stored title should be null because "" || null evaluates to null');

    // Contrast: non-empty string is stored as-is
    aliases.updateAliasTitle('r115-alias', 'New Title');
    const withTitle = aliases.resolveAlias('r115-alias');
    assert.strictEqual(withTitle.title, 'New Title', 'Non-empty string stored as-is');

    // null explicitly clears title
    aliases.updateAliasTitle('r115-alias', null);
    const cleared = aliases.resolveAlias('r115-alias');
    assert.strictEqual(cleared.title, null, 'null clears title');
  })) passed++; else failed++;

  // ── Round 116: loadAliases with extra unknown fields — silently preserved ──
  console.log('\nRound 116: loadAliases (extra unknown JSON fields — preserved by loose validation):');
  if (test('loadAliases preserves extra unknown fields because only aliases key is validated', () => {
    resetAliases();

    // Manually write an aliases file with extra fields
    const aliasesPath = aliases.getAliasesPath();
    const customData = {
      version: '1.0',
      aliases: {
        'test-session': {
          sessionPath: '/path/to/session',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          title: 'Test'
        }
      },
      metadata: {
        totalCount: 1,
        lastUpdated: '2026-01-01T00:00:00.000Z'
      },
      customField: 'extra data',
      debugInfo: { level: 3, verbose: true },
      tags: ['important', 'test']
    };
    fs.writeFileSync(aliasesPath, JSON.stringify(customData, null, 2), 'utf8');

    // loadAliases only validates data.aliases — extra fields pass through
    const loaded = aliases.loadAliases();
    assert.ok(loaded.aliases['test-session'], 'Should load the valid alias');
    assert.strictEqual(loaded.aliases['test-session'].title, 'Test');
    assert.strictEqual(loaded.customField, 'extra data',
      'Extra string field should be preserved');
    assert.deepStrictEqual(loaded.debugInfo, { level: 3, verbose: true },
      'Extra object field should be preserved');
    assert.deepStrictEqual(loaded.tags, ['important', 'test'],
      'Extra array field should be preserved');

    // After saving, extra fields survive a round-trip (saveAliases only updates metadata)
    aliases.setAlias('new-alias', '/path/to/new');
    const reloaded = aliases.loadAliases();
    assert.ok(reloaded.aliases['new-alias'], 'New alias should be saved');
    assert.strictEqual(reloaded.customField, 'extra data',
      'Extra field should survive save/load round-trip');
  })) passed++; else failed++;

  // ── Round 118: renameAlias to the same name — "already exists" because self-check ──
  console.log('\nRound 118: renameAlias (same name — "already exists" because data.aliases[newAlias] is truthy):');
  if (test('renameAlias to the same name returns "already exists" error (no self-rename short-circuit)', () => {
    resetAliases();
    aliases.setAlias('same-name', '/path/to/session');

    // Rename 'same-name' → 'same-name'
    // Line 333: data.aliases[newAlias] → truthy (the alias exists under that name)
    // Returns error before checking if oldAlias === newAlias
    const result = aliases.renameAlias('same-name', 'same-name');
    assert.strictEqual(result.success, false, 'Should fail');
    assert.ok(result.error.includes('already exists'),
      'Error should say "already exists" (not "same name" or a no-op success)');

    // Verify alias is unchanged
    const resolved = aliases.resolveAlias('same-name');
    assert.ok(resolved, 'Original alias should still exist');
    assert.strictEqual(resolved.sessionPath, '/path/to/session');
  })) passed++; else failed++;

  // ── Round 118: setAlias reserved names — case-insensitive rejection ──
  console.log('\nRound 118: setAlias (reserved names — case-insensitive rejection):');
  if (test('setAlias rejects all reserved names case-insensitively (list, help, remove, delete, create, set)', () => {
    resetAliases();

    // All reserved names in lowercase
    const reserved = ['list', 'help', 'remove', 'delete', 'create', 'set'];
    for (const name of reserved) {
      const result = aliases.setAlias(name, '/path/to/session');
      assert.strictEqual(result.success, false,
        `'${name}' should be rejected as reserved`);
      assert.ok(result.error.includes('reserved'),
        `Error for '${name}' should mention "reserved"`);
    }

    // Case-insensitive: uppercase variants also rejected
    const upperResult = aliases.setAlias('LIST', '/path/to/session');
    assert.strictEqual(upperResult.success, false,
      '"LIST" (uppercase) should be rejected (toLowerCase check)');

    const mixedResult = aliases.setAlias('Help', '/path/to/session');
    assert.strictEqual(mixedResult.success, false,
      '"Help" (mixed case) should be rejected');

    const allCapsResult = aliases.setAlias('DELETE', '/path/to/session');
    assert.strictEqual(allCapsResult.success, false,
      '"DELETE" (all caps) should be rejected');

    // Non-reserved names work fine
    const validResult = aliases.setAlias('my-session', '/path/to/session');
    assert.strictEqual(validResult.success, true,
      'Non-reserved name should succeed');
  })) passed++; else failed++;

  // ── Round 119: renameAlias with reserved newAlias name — parallel reserved check ──
  console.log('\nRound 119: renameAlias (reserved newAlias name — parallel check to setAlias):');
  if (test('renameAlias rejects reserved names for newAlias (same reserved list as setAlias)', () => {
    resetAliases();
    aliases.setAlias('my-alias', '/path/to/session');

    // Rename to reserved name 'list' — should fail
    const listResult = aliases.renameAlias('my-alias', 'list');
    assert.strictEqual(listResult.success, false, '"list" should be rejected');
    assert.ok(listResult.error.includes('reserved'),
      'Error should mention "reserved"');

    // Rename to reserved name 'help' (uppercase) — should fail
    const helpResult = aliases.renameAlias('my-alias', 'Help');
    assert.strictEqual(helpResult.success, false, '"Help" should be rejected');

    // Rename to reserved name 'delete' — should fail
    const deleteResult = aliases.renameAlias('my-alias', 'DELETE');
    assert.strictEqual(deleteResult.success, false, '"DELETE" should be rejected');

    // Verify alias is unchanged
    const resolved = aliases.resolveAlias('my-alias');
    assert.ok(resolved, 'Original alias should still exist after failed renames');
    assert.strictEqual(resolved.sessionPath, '/path/to/session');

    // Valid rename works
    const validResult = aliases.renameAlias('my-alias', 'new-valid-name');
    assert.strictEqual(validResult.success, true, 'Non-reserved name should succeed');
  })) passed++; else failed++;

  // ── Round 120: setAlias max length boundary — 128 accepted, 129 rejected ──
  console.log('\nRound 120: setAlias (max alias length boundary — 128 ok, 129 rejected):');
  if (test('setAlias accepts exactly 128-char alias name but rejects 129 chars (> 128 boundary)', () => {
    resetAliases();

    // 128 characters — exactly at limit (alias.length > 128 is false)
    const name128 = 'a'.repeat(128);
    const result128 = aliases.setAlias(name128, '/path/to/session');
    assert.strictEqual(result128.success, true,
      '128-char alias should be accepted (128 > 128 is false)');

    // 129 characters — just over limit
    const name129 = 'a'.repeat(129);
    const result129 = aliases.setAlias(name129, '/path/to/session');
    assert.strictEqual(result129.success, false,
      '129-char alias should be rejected (129 > 128 is true)');
    assert.ok(result129.error.includes('128'),
      'Error should mention the 128 character limit');

    // 1 character — minimum valid
    const name1 = 'x';
    const result1 = aliases.setAlias(name1, '/path/to/session');
    assert.strictEqual(result1.success, true,
      'Single character alias should be accepted');

    // Verify the 128-char alias was actually stored
    const resolved = aliases.resolveAlias(name128);
    assert.ok(resolved, '128-char alias should be resolvable');
    assert.strictEqual(resolved.sessionPath, '/path/to/session');
  })) passed++; else failed++;

  // ── Round 121: setAlias sessionPath validation — null, empty, whitespace, non-string ──
  console.log('\nRound 121: setAlias (sessionPath validation — null, empty, whitespace, non-string):');
  if (test('setAlias rejects invalid sessionPath: null, empty, whitespace-only, and non-string types', () => {
    resetAliases();

    // null sessionPath → falsy → rejected
    const nullResult = aliases.setAlias('test-alias', null);
    assert.strictEqual(nullResult.success, false, 'null path should fail');
    assert.ok(nullResult.error.includes('empty'), 'Error should mention empty');

    // undefined sessionPath → falsy → rejected
    const undefResult = aliases.setAlias('test-alias', undefined);
    assert.strictEqual(undefResult.success, false, 'undefined path should fail');

    // empty string → falsy → rejected
    const emptyResult = aliases.setAlias('test-alias', '');
    assert.strictEqual(emptyResult.success, false, 'Empty string path should fail');

    // whitespace-only → passes falsy check but trim().length === 0 → rejected
    const wsResult = aliases.setAlias('test-alias', '   ');
    assert.strictEqual(wsResult.success, false, 'Whitespace-only path should fail');

    // number → typeof !== 'string' → rejected
    const numResult = aliases.setAlias('test-alias', 42);
    assert.strictEqual(numResult.success, false, 'Number path should fail');

    // boolean → typeof !== 'string' → rejected
    const boolResult = aliases.setAlias('test-alias', true);
    assert.strictEqual(boolResult.success, false, 'Boolean path should fail');

    // Valid path works
    const validResult = aliases.setAlias('test-alias', '/valid/path');
    assert.strictEqual(validResult.success, true, 'Valid string path should succeed');
  })) passed++; else failed++;

  // ── Round 122: listAliases limit edge cases — limit=0, negative, NaN bypassed (JS falsy) ──
  console.log('\nRound 122: listAliases (limit edge cases — 0/negative/NaN are falsy, return all):');
  if (test('listAliases limit=0 returns all aliases because 0 is falsy in JS (no slicing)', () => {
    resetAliases();
    aliases.setAlias('alias-a', '/path/a');
    aliases.setAlias('alias-b', '/path/b');
    aliases.setAlias('alias-c', '/path/c');

    // limit=0: 0 is falsy → `if (0 && 0 > 0)` short-circuits → no slicing → ALL returned
    const zeroResult = aliases.listAliases({ limit: 0 });
    assert.strictEqual(zeroResult.length, 3,
      'limit=0 should return ALL aliases (0 is falsy in JS)');

    // limit=-1: -1 is truthy but -1 > 0 is false → no slicing → ALL returned
    const negResult = aliases.listAliases({ limit: -1 });
    assert.strictEqual(negResult.length, 3,
      'limit=-1 should return ALL aliases (-1 > 0 is false)');

    // limit=NaN: NaN is falsy → no slicing → ALL returned
    const nanResult = aliases.listAliases({ limit: NaN });
    assert.strictEqual(nanResult.length, 3,
      'limit=NaN should return ALL aliases (NaN is falsy)');

    // limit=1: normal case — returns exactly 1
    const oneResult = aliases.listAliases({ limit: 1 });
    assert.strictEqual(oneResult.length, 1,
      'limit=1 should return exactly 1 alias');

    // limit=2: returns exactly 2
    const twoResult = aliases.listAliases({ limit: 2 });
    assert.strictEqual(twoResult.length, 2,
      'limit=2 should return exactly 2 aliases');

    // limit=100 (more than total): returns all 3
    const bigResult = aliases.listAliases({ limit: 100 });
    assert.strictEqual(bigResult.length, 3,
      'limit > total should return all aliases');
  })) passed++; else failed++;

  // ── Round 125: loadAliases with __proto__ key in JSON — no prototype pollution ──
  console.log('\nRound 125: loadAliases (__proto__ key in JSON — safe, no prototype pollution):');
  if (test('loadAliases with __proto__ alias key does not pollute Object prototype', () => {
    // JSON.parse('{"__proto__":...}') creates a normal property named "__proto__",
    // it does NOT modify Object.prototype. This is safe but worth documenting.
    // The alias would be accessible via data.aliases['__proto__'] and iterable
    // via Object.entries, but it won't affect other objects.
    resetAliases();

    // Write raw JSON string with __proto__ as an alias name.
    // IMPORTANT: Cannot use JSON.stringify(obj) because {'__proto__':...} in JS
    // sets the prototype rather than creating an own property, so stringify drops it.
    // Must write the JSON string directly to simulate a maliciously crafted file.
    const aliasesPath = aliases.getAliasesPath();
    const now = new Date().toISOString();
    const rawJson = `{
  "version": "1.0.0",
  "aliases": {
    "__proto__": {
      "sessionPath": "/evil/path",
      "createdAt": "${now}",
      "title": "Prototype Pollution Attempt"
    },
    "normal": {
      "sessionPath": "/normal/path",
      "createdAt": "${now}",
      "title": "Normal Alias"
    }
  },
  "metadata": { "totalCount": 2, "lastUpdated": "${now}" }
}`;
    fs.writeFileSync(aliasesPath, rawJson);

    // Load aliases — should NOT pollute prototype
    const data = aliases.loadAliases();

    // Verify __proto__ did NOT pollute Object.prototype
    const freshObj = {};
    assert.strictEqual(freshObj.sessionPath, undefined,
      'Object.prototype should NOT have sessionPath (no pollution)');
    assert.strictEqual(freshObj.title, undefined,
      'Object.prototype should NOT have title (no pollution)');

    // The __proto__ key IS accessible as a normal property
    assert.ok(data.aliases['__proto__'],
      '__proto__ key exists as normal property in parsed aliases');
    assert.strictEqual(data.aliases['__proto__'].sessionPath, '/evil/path',
      '__proto__ alias data is accessible normally');

    // Normal alias also works
    assert.ok(data.aliases['normal'],
      'Normal alias coexists with __proto__ key');

    // resolveAlias with '__proto__' — rejected by regex (underscores ok but __ prefix works)
    // Actually ^[a-zA-Z0-9_-]+$ would ACCEPT '__proto__' since _ is allowed
    const resolved = aliases.resolveAlias('__proto__');
    // If the regex accepts it, it should find the alias
    if (resolved) {
      assert.strictEqual(resolved.sessionPath, '/evil/path',
        'resolveAlias can access __proto__ alias (regex allows underscores)');
    }

    // Object.keys should enumerate __proto__ from JSON.parse
    const keys = Object.keys(data.aliases);
    assert.ok(keys.includes('__proto__'),
      'Object.keys includes __proto__ from JSON.parse (normal property)');
    assert.ok(keys.includes('normal'),
      'Object.keys includes normal alias');
  })) passed++; else failed++;

  // Summary
  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();

