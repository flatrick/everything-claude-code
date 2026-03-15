#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { resolveInstallClosure } = require('../lib/install-resolver');

const REPO_ROOT = path.join(__dirname, '..', '..');
const SNAPSHOT_PATH = path.join(REPO_ROOT, 'tests', 'fixtures', 'resolver-closure-snapshots.json');
const TOOL_IDS = ['claude', 'cursor', 'codex'];

function getAvailablePackageNames(packagesDir) {
  if (!fs.existsSync(packagesDir)) return [];
  return fs.readdirSync(packagesDir).filter((name) => {
    const manifestPath = path.join(packagesDir, name, 'package.json');
    return fs.existsSync(manifestPath);
  }).sort();
}

function buildClosureMap(repoRoot) {
  const packagesDir = path.join(repoRoot, 'packages');
  const packageNames = getAvailablePackageNames(packagesDir);
  const result = {};

  for (const tool of TOOL_IDS) {
    result[tool] = {};
    for (const pkgName of packageNames) {
      let outcome;
      try {
        outcome = resolveInstallClosure([pkgName], tool);
      } catch (err) {
        result[tool][pkgName] = { success: false, errors: [`resolver threw: ${err.message}`] };
        continue;
      }
      if (outcome.success) {
        result[tool][pkgName] = { success: true, packages: outcome.closure.packages };
      } else {
        result[tool][pkgName] = { success: false, errors: outcome.errors };
      }
    }
  }

  return result;
}

function diffClosureMaps(expected, actual) {
  const diffs = [];

  for (const tool of TOOL_IDS) {
    if (!actual[tool]) {
      diffs.push(`Missing tool key in actual: "${tool}"`);
      continue;
    }
    const expectedPkgs = Object.keys(expected[tool]).sort();
    const actualPkgs = Object.keys(actual[tool]).sort();

    const added = actualPkgs.filter((p) => !expectedPkgs.includes(p));
    const removed = expectedPkgs.filter((p) => !actualPkgs.includes(p));
    for (const p of added) diffs.push(`[${tool}] New package not in snapshot: "${p}"`);
    for (const p of removed) diffs.push(`[${tool}] Package removed from repo but still in snapshot: "${p}"`);

    for (const pkgName of expectedPkgs) {
      if (!actual[tool][pkgName]) continue;
      const exp = expected[tool][pkgName];
      const act = actual[tool][pkgName];

      if (exp.success !== act.success) {
        diffs.push(`[${tool}/${pkgName}] success changed: ${exp.success} -> ${act.success}`);
        continue;
      }
      if (exp.success) {
        const expPkgs = JSON.stringify(exp.packages);
        const actPkgs = JSON.stringify(act.packages);
        if (expPkgs !== actPkgs) {
          diffs.push(`[${tool}/${pkgName}] packages changed: ${expPkgs} -> ${actPkgs}`);
        }
      }
    }
  }

  return diffs;
}

function validateResolverClosure(repoRoot = REPO_ROOT, io = { log: console.log, error: console.error }, options = {}) {
  const actual = buildClosureMap(repoRoot);
  const snapshotPath = options.snapshotPath || SNAPSHOT_PATH;
  const updateSnapshots = options.updateSnapshots === true;

  if (updateSnapshots || !fs.existsSync(snapshotPath)) {
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
    fs.writeFileSync(snapshotPath, JSON.stringify(actual, null, 2) + '\n', 'utf8');
    io.log(`Resolver closure snapshot written to ${path.relative(repoRoot, snapshotPath)}`);
    return { exitCode: 0, snapshot: actual };
  }

  let expected;
  try {
    expected = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  } catch (err) {
    io.error(`ERROR: Could not read snapshot at ${snapshotPath}: ${err.message}`);
    return { exitCode: 1, errors: [err.message] };
  }

  const diffs = diffClosureMaps(expected, actual);
  if (diffs.length > 0) {
    for (const d of diffs) io.error(`ERROR: ${d}`);
    io.error('');
    io.error('Run with --update-snapshots to regenerate the snapshot baseline.');
    return { exitCode: 1, errors: diffs };
  }

  const pkgCount = Object.values(actual).reduce((n, pkgs) => n + Object.keys(pkgs).length, 0);
  io.log(`Resolver closure snapshot verified (${pkgCount} entries)`);
  return { exitCode: 0 };
}

function runCli(io = { log: console.log, error: console.error }, argv = process.argv.slice(2)) {
  const updateSnapshots = argv.includes('--update-snapshots');
  return validateResolverClosure(REPO_ROOT, io, { updateSnapshots });
}

if (require.main === module) {
  const result = runCli();
  process.exit(result.exitCode);
}

module.exports = {
  buildClosureMap,
  validateResolverClosure,
  runCli
};
