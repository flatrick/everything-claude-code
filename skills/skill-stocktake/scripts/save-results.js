#!/usr/bin/env node
/**
 * save-results.js — Merge evaluated skills into results.json with correct UTC timestamp.
 *
 * Usage: node save-results.js RESULTS_JSON < stdin
 * stdin format: { "skills": {...}, "mode"?: "full"|"quick", "batch_progress"?: {...} }
 *
 * Always sets evaluated_at to current UTC time.
 * Merges stdin .skills into existing results.json (new entries override old).
 * Optionally updates .mode and .batch_progress if present in stdin.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const resultsJson = process.argv[2];

function main() {
  if (!resultsJson) {
    console.error('Error: RESULTS_JSON argument required');
    console.error('Usage: node save-results.js RESULTS_JSON <<< "$EVAL_JSON"');
    process.exit(1);
  }

  const evaluatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  let inputData = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { inputData += chunk; });
  process.stdin.on('end', () => {
    let inputJson;
    try {
      inputJson = JSON.parse(inputData);
    } catch (err) {
      console.error('Error: stdin is not valid JSON');
      process.exit(1);
    }

    if (!fs.existsSync(resultsJson)) {
      const out = { ...inputJson, evaluated_at: evaluatedAt };
      fs.writeFileSync(resultsJson, JSON.stringify(out, null, 2), 'utf8');
      process.exit(0);
      return;
    }

    const existing = JSON.parse(fs.readFileSync(resultsJson, 'utf8'));
    const merged = {
      ...existing,
      evaluated_at: evaluatedAt,
      skills: { ...(existing.skills || {}), ...(inputJson.skills || {}) }
    };
    if (inputJson.mode !== undefined) merged.mode = inputJson.mode;
    if (inputJson.batch_progress !== undefined) merged.batch_progress = inputJson.batch_progress;

    const tmpFile = resultsJson + '.' + process.pid + '.' + Date.now() + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(merged, null, 2), 'utf8');
    fs.renameSync(tmpFile, resultsJson);
    process.exit(0);
  });
}

main();
