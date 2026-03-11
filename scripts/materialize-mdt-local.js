#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const {
  resolveSelectedPackages
} = require('./install-mdt');
const {
  recordBridgeDecision,
  detectRepoRoot
} = require('./lib/mdt-state');

const REPO_ROOT = path.join(__dirname, '..');
const CURSOR_RULES_SRC = path.join(REPO_ROOT, 'cursor-template', 'rules');

function parseArgs(args) {
  let target = 'cursor';
  let surface = null;
  let repoDir = process.cwd();
  let overrideDir = null;
  const packageNames = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--target' && args[i + 1]) {
      target = args[++i];
    } else if (arg === '--surface' && args[i + 1]) {
      surface = args[++i];
    } else if (arg === '--repo' && args[i + 1]) {
      repoDir = path.resolve(args[++i]);
    } else if (arg === '--override' && args[i + 1]) {
      overrideDir = path.resolve(args[++i]);
    } else if (!arg.startsWith('-')) {
      packageNames.push(arg);
    }
  }

  return { target, surface, repoDir, overrideDir, packageNames };
}

function usage() {
  console.error('Usage: node scripts/materialize-mdt-local.js --target cursor --surface rules [--repo <path>] [--override <tool-config-dir>] [package ...]');
  process.exit(1);
}

function materializeCursorRules(repoDir, packageNames) {
  const resolvedRepoDir = detectRepoRoot(repoDir);
  const destDir = path.join(resolvedRepoDir, '.cursor', 'rules');
  const selectedPackages = resolveSelectedPackages(packageNames);
  const copied = new Set();

  fs.mkdirSync(destDir, { recursive: true });

  for (const selectedPackage of selectedPackages) {
    const cursorRules = Array.isArray(selectedPackage.tools.cursor?.rules)
      ? selectedPackage.tools.cursor.rules
      : [];

    for (const ruleFile of cursorRules) {
      const srcPath = path.join(CURSOR_RULES_SRC, ruleFile);
      const destPath = path.join(destDir, ruleFile);
      if (!fs.existsSync(srcPath)) {
        console.error(`Warning: Cursor rule '${ruleFile}' for package '${selectedPackage.name}' does not exist, skipping.`);
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
      copied.add(ruleFile);
    }
  }

  return { repoDir: resolvedRepoDir, destDir, copied: [...copied].sort() };
}

function main() {
  const { target, surface, repoDir, overrideDir, packageNames } = parseArgs(process.argv.slice(2));
  if (!surface || packageNames.length === 0) {
    usage();
  }

  if (overrideDir) {
    fs.mkdirSync(overrideDir, { recursive: true });
    process.env.CONFIG_DIR = overrideDir;
  }

  if (target !== 'cursor' || surface !== 'rules') {
    console.error(`Error: unsupported bridge target '${target}' + surface '${surface}'.`);
    process.exit(1);
  }

  const result = materializeCursorRules(repoDir, packageNames);
  recordBridgeDecision({
    repoRoot: result.repoDir,
    surface: `${target}.${surface}`,
    decision: 'installed'
  });

  console.log(`Materialized ${target}.${surface} bridge into ${result.destDir}`);
  if (result.copied.length > 0) {
    console.log(`Copied ${result.copied.length} files: ${result.copied.join(', ')}`);
  } else {
    console.log('No bridge files were copied.');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  materializeCursorRules
};
