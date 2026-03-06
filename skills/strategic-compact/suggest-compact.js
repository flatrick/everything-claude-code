#!/usr/bin/env node
/**
 * Skill entrypoint wrapper for strategic compact suggestions.
 * Shared behavior lives in scripts/hooks/suggest-compact.js.
 */

const shared = require('../../scripts/hooks/suggest-compact');

if (require.main === module) {
  shared.runCli();
}

module.exports = shared;
