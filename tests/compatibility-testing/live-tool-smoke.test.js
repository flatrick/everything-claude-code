const assert = require('assert');
const { probeNodeSubprocess } = require('../helpers/subprocess-capability');
const { summarizeTool } = require('../../scripts/smoke-tool-setups');
const { TOOL_WORKFLOW_CONTRACT } = require('../../scripts/lib/tool-workflow-contract');
const {
  cleanupInstall,
  installTarget,
  repoRoot,
  runInstalledMdt
} = require('./shared-fixtures');

const LIVE_TOOL_FIXTURES = {
  claude: {
    target: 'claude',
    packages: ['--dev', 'typescript', 'continuous-learning']
  },
  cursor: {
    target: 'cursor',
    packages: ['--dev', 'typescript', 'continuous-learning']
  },
  codex: {
    target: 'codex',
    packages: ['--dev', 'typescript', 'continuous-learning']
  }
};

function runTests() {
  console.log('\n=== Compatibility Testing: Live Tool Smoke ===\n');

  const probe = probeNodeSubprocess();
  if (!probe.available) {
    console.log(`[subprocess-check] nested Node subprocesses unavailable (${probe.reason}); skipping suite`);
    console.log('\nPassed: 0');
    console.log('Failed: 0');
    console.log('Skipped: 0');
    console.log('Total:  0\n');
    process.exit(0);
  }

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const tool of Object.keys(LIVE_TOOL_FIXTURES)) {
    const summary = summarizeTool(tool, TOOL_WORKFLOW_CONTRACT.smokeProbes[tool] || []);
    const probeDetails = summary.probes.map((probeResult) => `${probeResult.command}: ${probeResult.detail}`).join('; ');

    if (summary.status === 'SKIP') {
      console.log(`  - ${tool}: SKIP (${probeDetails})`);
      skipped++;
      continue;
    }

    if (summary.status === 'FAIL') {
      console.log(`  ✗ ${tool} live smoke contract`);
      console.log(`    Error: ${probeDetails}`);
      failed++;
      continue;
    }

    const fixtureConfig = LIVE_TOOL_FIXTURES[tool];
    const fixture = installTarget(fixtureConfig.target, fixtureConfig.packages);

    try {
      const setup = runInstalledMdt(
        fixture,
        ['smoke', 'tool-setups', '--tool', tool],
        { cwd: repoRoot }
      );
      assert.strictEqual(setup.status, 0, `${setup.stdout}\n${setup.stderr}`);

      const workflow = runInstalledMdt(
        fixture,
        ['smoke', 'workflows', '--tool', tool],
        { cwd: repoRoot }
      );
      assert.strictEqual(workflow.status, 0, `${workflow.stdout}\n${workflow.stderr}`);

      console.log(`  ✓ ${tool} live smoke contract`);
      passed++;
    } catch (error) {
      console.log(`  ✗ ${tool} live smoke contract`);
      console.log(`    Error: ${error.message}`);
      failed++;
    } finally {
      cleanupInstall(fixture);
    }
  }

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total:  ${passed + failed + skipped}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
