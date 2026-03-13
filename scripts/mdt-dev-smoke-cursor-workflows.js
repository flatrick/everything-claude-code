#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { TOOL_WORKFLOW_CONTRACT } = require('./lib/tool-workflow-contract');
const { summarizeTool } = require('./mdt-dev-smoke-tool-setups');

function resolveCursorInstallRoot(scriptDir) {
  if (path.basename(scriptDir) === 'scripts' && path.basename(path.dirname(scriptDir)) === 'mdt') {
    const candidate = path.join(scriptDir, '..', '..');
    if (path.basename(candidate) === '.cursor' || fs.existsSync(path.join(candidate, 'commands'))) {
      return candidate;
    }
  }

  return null;
}

function resolveWorkspaceRoot(scriptDir) {
  const cursorInstallRoot = resolveCursorInstallRoot(scriptDir);
  if (cursorInstallRoot) {
    return process.cwd();
  }

  return path.join(scriptDir, '..');
}

function parseArgs(argv) {
  const formatArg = argv.find((arg) => arg.startsWith('--format='));
  if (formatArg) {
    return { format: formatArg.split('=')[1] || 'text' };
  }

  const formatIndex = argv.indexOf('--format');
  if (formatIndex >= 0) {
    return { format: argv[formatIndex + 1] || 'text' };
  }

  return { format: 'text' };
}

function readFile(rootDir, relativePath) {
  if (!rootDir) {
    return {
      relativePath,
      exists: false,
      content: ''
    };
  }

  const absolutePath = path.join(rootDir, relativePath);
  const exists = fs.existsSync(absolutePath);
  return {
    relativePath,
    exists,
    content: exists ? fs.readFileSync(absolutePath, 'utf8') : ''
  };
}

function buildPlanChecks(files) {
  const planRule = files['cursor-template/rules/common-development-workflow.md'];

  return {
    workflow: 'plan',
    checks: [
      {
        path: 'AGENTS.md',
        ok: files['AGENTS.md'].exists && files['AGENTS.md'].content.includes('Plan Before Execute'),
        message: 'root AGENTS.md should require planning before execution'
      },
      {
        path: 'cursor-template/commands/plan.md',
        ok: files['cursor-template/commands/plan.md'].exists,
        message: 'Cursor plan command should exist'
      },
      {
        path: 'cursor-template/rules/common-development-workflow.md',
        ok:
          planRule.exists
          && planRule.content.toLowerCase().includes('plan'),
        message: 'Cursor planning rule should exist and describe planning behavior'
      }
    ]
  };
}

function buildTddChecks(files) {
  return {
    workflow: 'tdd',
    checks: [
      {
        path: 'AGENTS.md',
        ok: files['AGENTS.md'].exists && files['AGENTS.md'].content.includes('**TDD workflow (mandatory):**'),
        message: 'root AGENTS.md should require TDD'
      },
      {
        path: 'cursor-template/commands/tdd.md',
        ok: files['cursor-template/commands/tdd.md'].exists,
        message: 'Cursor TDD command should exist'
      },
      {
        path: 'cursor-template/rules/common-testing.md',
        ok:
          files['cursor-template/rules/common-testing.md'].exists
          && files['cursor-template/rules/common-testing.md'].content.includes('tests'),
        message: 'Cursor testing rule should exist and describe testing behavior'
      }
    ]
  };
}

function buildCodeReviewChecks(files) {
  return {
    workflow: 'code-review',
    checks: [
      {
        path: 'cursor-template/commands/code-review.md',
        ok: files['cursor-template/commands/code-review.md'].exists,
        message: 'Cursor code-review command should exist'
      },
      {
        path: 'cursor-template/rules/common-coding-style.md',
        ok: files['cursor-template/rules/common-coding-style.md'].exists,
        message: 'Cursor coding-style rule should exist'
      }
    ]
  };
}

function buildVerifyChecks(files) {
  return {
    workflow: 'verify',
    checks: [
      {
        path: 'cursor-template/commands/verify.md',
        ok: files['cursor-template/commands/verify.md'].exists,
        message: 'Cursor verify command should exist'
      },
      {
        path: 'cursor-template/rules/common-testing.md',
        ok: files['cursor-template/rules/common-testing.md'].exists,
        message: 'Cursor testing rule should exist for verify guidance'
      }
    ]
  };
}

function buildSmokeChecks(files, options = {}) {
  const cursorSummary = summarizeTool('cursor', TOOL_WORKFLOW_CONTRACT.smokeProbes.cursor || [], options);
  const hasRequiredFiles = [
    files['cursor-template/commands/mdt-dev-smoke.md'],
    files['docs/testing/manual-verification/cursor.md']
  ].every((file) => file && file.exists);
  const cliPass = cursorSummary.status === 'PASS';
  const cliSkip = cursorSummary.status === 'SKIP';
  const cliFail = cursorSummary.status === 'FAIL';
  const cliDetails = cursorSummary.probes.map((probe) => `${probe.command} - ${probe.detail}`).join('; ');

  return {
    workflow: 'mdt-dev-smoke',
    checks: [
      {
        path: 'cursor-template/commands/mdt-dev-smoke.md',
        ok: files['cursor-template/commands/mdt-dev-smoke.md'].exists,
        message: 'Cursor dev smoke command should exist'
      },
      {
        path: 'docs/testing/manual-verification/cursor.md',
        ok: files['docs/testing/manual-verification/cursor.md'].exists,
        message: 'Cursor manual verification guide should exist'
      },
      {
        path: 'cursor CLI probes',
        ok: cliPass || cliSkip,
        statusOverride: cliSkip ? 'SKIP' : undefined,
        message: cliSkip
          ? `Cursor CLI dev smoke was skipped: ${cliDetails}`
          : cliFail
            ? `Cursor CLI dev smoke failed: ${cliDetails}`
            : 'Cursor CLI dev smoke probes passed'
      }
    ],
    statusOverride: hasRequiredFiles && cliSkip ? 'SKIP' : undefined
  };
}

function buildSecurityChecks(files) {
  return {
    workflow: 'security',
    checks: [
      {
        path: 'AGENTS.md',
        ok: files['AGENTS.md'].exists && files['AGENTS.md'].content.includes('Security-First'),
        message: 'root AGENTS.md should carry security-first guidance'
      },
      {
        path: 'cursor-template/rules/common-security.md',
        ok: files['cursor-template/rules/common-security.md'].exists,
        message: 'Cursor security rule should exist'
      }
    ]
  };
}

function buildE2eChecks(files) {
  return {
    workflow: 'e2e',
    checks: [
      {
        path: 'AGENTS.md',
        ok: files['AGENTS.md'].exists && files['AGENTS.md'].content.includes('3. **E2E tests**'),
        message: 'root AGENTS.md should require E2E coverage for critical flows'
      },
      {
        path: 'cursor-template/commands/e2e.md',
        ok: files['cursor-template/commands/e2e.md'].exists,
        message: 'Cursor e2e command should exist'
      },
      {
        path: 'cursor-template/rules/common-testing.md',
        ok: files['cursor-template/rules/common-testing.md'].exists,
        message: 'Cursor testing rule should exist for E2E guidance'
      }
    ]
  };
}

function buildWorkflowChecks(files, options = {}) {
  return [
    buildPlanChecks(files),
    buildTddChecks(files),
    buildCodeReviewChecks(files),
    buildVerifyChecks(files),
    buildSmokeChecks(files, options),
    buildSecurityChecks(files),
    buildE2eChecks(files)
  ];
}

function buildInstalledPlanChecks(files) {
  return {
    workflow: 'plan',
    checks: [
      {
        path: 'AGENTS.md',
        ok: files['AGENTS.md'].exists && files['AGENTS.md'].content.includes('Plan Before Execute'),
        message: 'workspace AGENTS.md should require planning before execution'
      },
      {
        path: '~/.cursor/commands/plan.md',
        ok: files['~/.cursor/commands/plan.md'].exists,
        message: 'Installed Cursor plan command should exist'
      },
      {
        path: '~/.cursor/rules/common-development-workflow.mdc',
        ok: files['~/.cursor/rules/common-development-workflow.mdc'].exists,
        message: 'Installed Cursor planning rule should exist'
      }
    ]
  };
}

function buildInstalledTddChecks(files) {
  return {
    workflow: 'tdd',
    checks: [
      {
        path: 'AGENTS.md',
        ok: files['AGENTS.md'].exists && files['AGENTS.md'].content.includes('**TDD workflow (mandatory):**'),
        message: 'workspace AGENTS.md should require TDD'
      },
      {
        path: '~/.cursor/commands/tdd.md',
        ok: files['~/.cursor/commands/tdd.md'].exists,
        message: 'Installed Cursor TDD command should exist'
      },
      {
        path: '~/.cursor/rules/common-testing.mdc',
        ok: files['~/.cursor/rules/common-testing.mdc'].exists,
        message: 'Installed Cursor testing rule should exist'
      }
    ]
  };
}

function buildInstalledCodeReviewChecks(files) {
  return {
    workflow: 'code-review',
    checks: [
      {
        path: '~/.cursor/commands/code-review.md',
        ok: files['~/.cursor/commands/code-review.md'].exists,
        message: 'Installed Cursor code-review command should exist'
      },
      {
        path: '~/.cursor/rules/common-coding-style.mdc',
        ok: files['~/.cursor/rules/common-coding-style.mdc'].exists,
        message: 'Installed Cursor coding-style rule should exist'
      }
    ]
  };
}

function buildInstalledVerifyChecks(files) {
  return {
    workflow: 'verify',
    checks: [
      {
        path: '~/.cursor/commands/verify.md',
        ok: files['~/.cursor/commands/verify.md'].exists,
        message: 'Installed Cursor verify command should exist'
      },
      {
        path: '~/.cursor/rules/common-testing.mdc',
        ok: files['~/.cursor/rules/common-testing.mdc'].exists,
        message: 'Installed Cursor testing rule should exist'
      }
    ]
  };
}

function buildInstalledSmokeChecks(files, options = {}) {
  const cursorSummary = summarizeTool('cursor', TOOL_WORKFLOW_CONTRACT.smokeProbes.cursor || [], options);
  const cliPass = cursorSummary.status === 'PASS';
  const cliSkip = cursorSummary.status === 'SKIP';
  const cliFail = cursorSummary.status === 'FAIL';
  const cliDetails = cursorSummary.probes.map((probe) => `${probe.command} - ${probe.detail}`).join('; ');

  return {
    workflow: 'mdt-dev-smoke',
    checks: [
      {
        path: '~/.cursor/commands/mdt-dev-smoke.md',
        ok: files['~/.cursor/commands/mdt-dev-smoke.md'].exists,
        message: 'Installed Cursor dev smoke command should exist'
      },
      {
        path: '~/.cursor/mdt/scripts/mdt-dev-smoke-cursor-workflows.js',
        ok: files['~/.cursor/mdt/scripts/mdt-dev-smoke-cursor-workflows.js'].exists,
        message: 'Installed Cursor workflow smoke script should exist'
      },
      {
        path: 'cursor CLI probes',
        ok: cliPass || cliSkip,
        statusOverride: cliSkip ? 'SKIP' : undefined,
        message: cliSkip
          ? `Cursor CLI dev smoke was skipped: ${cliDetails}`
          : cliFail
            ? `Cursor CLI dev smoke failed: ${cliDetails}`
            : 'Cursor CLI dev smoke probes passed'
      }
    ],
    statusOverride: cliSkip ? 'SKIP' : undefined
  };
}

function buildInstalledSecurityChecks(files) {
  return {
    workflow: 'security',
    checks: [
      {
        path: 'AGENTS.md',
        ok: files['AGENTS.md'].exists && files['AGENTS.md'].content.includes('Security-First'),
        message: 'workspace AGENTS.md should carry security-first guidance'
      },
      {
        path: '~/.cursor/rules/common-security.mdc',
        ok: files['~/.cursor/rules/common-security.mdc'].exists,
        message: 'Installed Cursor security rule should exist'
      }
    ]
  };
}

function buildInstalledE2eChecks(files) {
  return {
    workflow: 'e2e',
    checks: [
      {
        path: 'AGENTS.md',
        ok: files['AGENTS.md'].exists && files['AGENTS.md'].content.includes('3. **E2E tests**'),
        message: 'workspace AGENTS.md should require E2E coverage for critical flows'
      },
      {
        path: '~/.cursor/commands/e2e.md',
        ok: files['~/.cursor/commands/e2e.md'].exists,
        message: 'Installed Cursor e2e command should exist'
      },
      {
        path: '~/.cursor/rules/common-testing.mdc',
        ok: files['~/.cursor/rules/common-testing.mdc'].exists,
        message: 'Installed Cursor testing rule should exist for E2E guidance'
      }
    ]
  };
}

function buildInstalledWorkflowChecks(files, options = {}) {
  return [
    buildInstalledPlanChecks(files),
    buildInstalledTddChecks(files),
    buildInstalledCodeReviewChecks(files),
    buildInstalledVerifyChecks(files),
    buildInstalledSmokeChecks(files, options),
    buildInstalledSecurityChecks(files),
    buildInstalledE2eChecks(files)
  ];
}

function buildWorkflowsResult(workflowChecks) {
  return workflowChecks.map((entry) => {
    const failures = entry.checks.filter((check) => !check.ok);
    const skips = entry.checks.filter((check) => check.statusOverride === 'SKIP');
    return {
      workflow: entry.workflow,
      status: entry.statusOverride || (failures.length === 0 ? (skips.length > 0 ? 'SKIP' : 'PASS') : 'FAIL'),
      checks: entry.checks,
      failures,
      skips
    };
  });
}

function createRepoFiles(workspaceRoot) {
  return {
    'AGENTS.md': readFile(workspaceRoot, 'AGENTS.md'),
    'cursor-template/commands/plan.md': readFile(workspaceRoot, path.join('cursor-template', 'commands', 'plan.md')),
    'cursor-template/commands/tdd.md': readFile(workspaceRoot, path.join('cursor-template', 'commands', 'tdd.md')),
    'cursor-template/commands/code-review.md': readFile(workspaceRoot, path.join('cursor-template', 'commands', 'code-review.md')),
    'cursor-template/commands/verify.md': readFile(workspaceRoot, path.join('cursor-template', 'commands', 'verify.md')),
    'cursor-template/commands/mdt-dev-smoke.md': readFile(workspaceRoot, path.join('cursor-template', 'commands', 'mdt-dev-smoke.md')),
    'cursor-template/commands/e2e.md': readFile(workspaceRoot, path.join('cursor-template', 'commands', 'e2e.md')),
    'cursor-template/rules/common-development-workflow.md': readFile(workspaceRoot, path.join('cursor-template', 'rules', 'common-development-workflow.md')),
    'cursor-template/rules/common-testing.md': readFile(workspaceRoot, path.join('cursor-template', 'rules', 'common-testing.md')),
    'cursor-template/rules/common-coding-style.md': readFile(workspaceRoot, path.join('cursor-template', 'rules', 'common-coding-style.md')),
    'cursor-template/rules/common-security.md': readFile(workspaceRoot, path.join('cursor-template', 'rules', 'common-security.md')),
    'docs/testing/manual-verification/cursor.md': readFile(workspaceRoot, path.join('docs', 'testing', 'manual-verification', 'cursor.md'))
  };
}

function createInstalledFiles(cursorRoot, workspaceRoot) {
  return {
    'AGENTS.md': readFile(workspaceRoot, 'AGENTS.md'),
    '~/.cursor/commands/plan.md': readFile(cursorRoot, path.join('commands', 'plan.md')),
    '~/.cursor/commands/tdd.md': readFile(cursorRoot, path.join('commands', 'tdd.md')),
    '~/.cursor/commands/code-review.md': readFile(cursorRoot, path.join('commands', 'code-review.md')),
    '~/.cursor/commands/verify.md': readFile(cursorRoot, path.join('commands', 'verify.md')),
    '~/.cursor/commands/mdt-dev-smoke.md': readFile(cursorRoot, path.join('commands', 'mdt-dev-smoke.md')),
    '~/.cursor/commands/e2e.md': readFile(cursorRoot, path.join('commands', 'e2e.md')),
    '~/.cursor/rules/common-development-workflow.mdc': readFile(cursorRoot, path.join('rules', 'common-development-workflow.mdc')),
    '~/.cursor/rules/common-testing.mdc': readFile(cursorRoot, path.join('rules', 'common-testing.mdc')),
    '~/.cursor/rules/common-coding-style.mdc': readFile(cursorRoot, path.join('rules', 'common-coding-style.mdc')),
    '~/.cursor/rules/common-security.mdc': readFile(cursorRoot, path.join('rules', 'common-security.mdc')),
    '~/.cursor/mdt/scripts/mdt-dev-smoke-cursor-workflows.js': readFile(cursorRoot, path.join('mdt', 'scripts', 'mdt-dev-smoke-cursor-workflows.js'))
  };
}

function resolveWorkflowContext(options = {}) {
  const workspaceRoot = options.workspaceRoot || resolveWorkspaceRoot(__dirname);
  const cursorRoot = options.cursorRoot || resolveCursorInstallRoot(__dirname);

  return {
    workspaceRoot,
    cursorRoot,
    installedTargetMode: Boolean(cursorRoot)
  };
}

function reportResult(io, format, workflows, installedTargetMode) {
  if (format === 'json') {
    io.log(JSON.stringify({
      ok: workflows.every((workflow) => workflow.status !== 'FAIL'),
      workflows
    }, null, 2));
    return;
  }

  io.log(`Cursor workflow dev smoke (${installedTargetMode ? 'installed-target' : 'repo-source'} mode):`);
  for (const workflow of workflows) {
    io.log(`- ${workflow.workflow}: ${workflow.status}`);
    for (const failure of workflow.failures) {
      io.log(`  FAIL ${failure.path} - ${failure.message}`);
    }
    for (const skip of workflow.skips) {
      io.log(`  SKIP ${skip.path} - ${skip.message}`);
    }
  }
}

function smokeCursorWorkflows(options = {}) {
  const io = options.io || console;
  const { workspaceRoot, cursorRoot, installedTargetMode } = resolveWorkflowContext(options);
  const files = installedTargetMode
    ? createInstalledFiles(cursorRoot, workspaceRoot)
    : createRepoFiles(workspaceRoot);
  const workflowChecks = installedTargetMode
    ? buildInstalledWorkflowChecks(files, options)
    : buildWorkflowChecks(files, options);
  const workflows = buildWorkflowsResult(workflowChecks);

  const result = {
    ok: workflows.every((workflow) => workflow.status !== 'FAIL'),
    workflows
  };

  reportResult(io, options.format, workflows, installedTargetMode);

  return {
    exitCode: result.ok ? 0 : 1,
    result
  };
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const { exitCode } = smokeCursorWorkflows({ format: args.format });
  process.exit(exitCode);
}

module.exports = {
  resolveWorkspaceRoot,
  resolveCursorInstallRoot,
  resolveWorkflowContext,
  smokeCursorWorkflows
};
