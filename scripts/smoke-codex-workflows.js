#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const formatArg = argv.find(arg => arg.startsWith('--format='));
  if (formatArg) {
    return { format: formatArg.split('=')[1] || 'text' };
  }

  const formatIndex = argv.indexOf('--format');
  if (formatIndex >= 0) {
    return { format: argv[formatIndex + 1] || 'text' };
  }

  return { format: 'text' };
}

function readRepoFile(rootDir, relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  return {
    relativePath,
    exists: fs.existsSync(absolutePath),
    content: fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : ''
  };
}

function buildPlanChecks(files) {
  return {
    workflow: 'plan',
    checks: [
      {
        path: 'AGENTS.md',
        ok: files['AGENTS.md'].exists && files['AGENTS.md'].content.includes('Plan Before Execute'),
        message: 'root AGENTS.md should require planning before execution'
      },
      {
        path: 'AGENTS.md',
        ok: files['AGENTS.md'].exists && files['AGENTS.md'].content.includes('| planner |'),
        message: 'root AGENTS.md should expose the planner agent'
      },
      {
        path: 'codex-template/AGENTS.md',
        ok: files['codex-template/AGENTS.md'].exists && files['codex-template/AGENTS.md'].content.includes('Complex features, architecture'),
        message: 'Codex AGENTS should recommend the planning model path for complex work'
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
        path: 'codex-template/AGENTS.md',
        ok: files['codex-template/AGENTS.md'].exists && files['codex-template/AGENTS.md'].content.includes('tdd-workflow'),
        message: 'Codex AGENTS should advertise the tdd-workflow skill'
      },
      {
        path: '.agents/skills/tdd-workflow/SKILL.md',
        ok: files['.agents/skills/tdd-workflow/SKILL.md'].exists && files['.agents/skills/tdd-workflow/SKILL.md'].content.includes('Test-Driven Development Workflow'),
        message: 'Codex TDD skill should exist and describe the workflow'
      },
      {
        path: 'codex-template/config.toml',
        ok: files['codex-template/config.toml'].exists && files['codex-template/config.toml'].content.includes('Test-Driven Development (TDD)'),
        message: 'Codex config should reinforce TDD in persistent instructions'
      }
    ]
  };
}

function buildVerifyChecks(files) {
  return {
    workflow: 'verify',
    checks: [
      {
        path: 'codex-template/AGENTS.md',
        ok: files['codex-template/AGENTS.md'].exists && files['codex-template/AGENTS.md'].content.includes('verification-loop'),
        message: 'Codex AGENTS should advertise the verification-loop skill'
      },
      {
        path: '.agents/skills/verification-loop/SKILL.md',
        ok: files['.agents/skills/verification-loop/SKILL.md'].exists && files['.agents/skills/verification-loop/SKILL.md'].content.includes('Verification Loop Skill'),
        message: 'Codex verification skill should exist and describe the verification loop'
      },
      {
        path: 'codex-template/config.toml',
        ok:
          files['codex-template/config.toml'].exists &&
          files['codex-template/config.toml'].content.includes('sandbox_mode = "workspace-write"') &&
          files['codex-template/config.toml'].content.includes('[mcp_servers.github]') &&
          files['codex-template/config.toml'].content.includes('[mcp_servers.sequential-thinking]'),
        message: 'Codex config should provide the expected verification sandbox and MCP scaffolding'
      }
    ]
  };
}

function buildSecurityChecks(files) {
  return {
    workflow: 'security',
    checks: [
      {
        path: 'codex-template/AGENTS.md',
        ok:
          files['codex-template/AGENTS.md'].exists &&
          files['codex-template/AGENTS.md'].content.includes('security-review'),
        message: 'Codex AGENTS should advertise the security-review skill'
      },
      {
        path: '.agents/skills/security-review/SKILL.md',
        ok:
          files['.agents/skills/security-review/SKILL.md'].exists &&
          files['.agents/skills/security-review/SKILL.md'].content.includes('Security Review Skill'),
        message: 'Codex security-review skill should exist and describe the security review workflow'
      },
      {
        path: 'codex-template/config.toml',
        ok:
          files['codex-template/config.toml'].exists &&
          files['codex-template/config.toml'].content.includes('Security-First'),
        message: 'Codex config should reinforce Security-First in persistent instructions'
      }
    ]
  };
}

function buildE2eChecks(files) {
  return {
    workflow: 'e2e',
    checks: [
      {
        path: 'codex-template/AGENTS.md',
        ok:
          files['codex-template/AGENTS.md'].exists &&
          files['codex-template/AGENTS.md'].content.includes('e2e-testing'),
        message: 'Codex AGENTS should advertise the e2e-testing skill'
      },
      {
        path: '.agents/skills/e2e-testing/SKILL.md',
        ok:
          files['.agents/skills/e2e-testing/SKILL.md'].exists &&
          files['.agents/skills/e2e-testing/SKILL.md'].content.includes('E2E Testing Patterns'),
        message: 'Codex e2e-testing skill should exist and describe the E2E testing patterns'
      }
    ]
  };
}

function buildWorkflowChecks(files) {
  return [
    buildPlanChecks(files),
    buildTddChecks(files),
    buildVerifyChecks(files),
    buildSecurityChecks(files),
    buildE2eChecks(files)
  ];
}

function smokeCodexWorkflows(options = {}) {
  const rootDir = options.rootDir || path.join(__dirname, '..');
  const io = options.io || console;
  const files = {
    'AGENTS.md': readRepoFile(rootDir, 'AGENTS.md'),
    'codex-template/AGENTS.md': readRepoFile(rootDir, path.join('codex-template', 'AGENTS.md')),
    'codex-template/config.toml': readRepoFile(rootDir, path.join('codex-template', 'config.toml')),
    '.agents/skills/tdd-workflow/SKILL.md': readRepoFile(rootDir, path.join('.agents', 'skills', 'tdd-workflow', 'SKILL.md')),
    '.agents/skills/verification-loop/SKILL.md': readRepoFile(
      rootDir,
      path.join('.agents', 'skills', 'verification-loop', 'SKILL.md')
    ),
    '.agents/skills/security-review/SKILL.md': readRepoFile(
      rootDir,
      path.join('.agents', 'skills', 'security-review', 'SKILL.md')
    ),
    '.agents/skills/e2e-testing/SKILL.md': readRepoFile(
      rootDir,
      path.join('.agents', 'skills', 'e2e-testing', 'SKILL.md')
    )
  };

  const workflows = buildWorkflowChecks(files).map(entry => {
    const failures = entry.checks.filter(check => !check.ok);
    return {
      workflow: entry.workflow,
      status: failures.length === 0 ? 'PASS' : 'FAIL',
      checks: entry.checks,
      failures
    };
  });

  const result = {
    ok: workflows.every(workflow => workflow.status === 'PASS'),
    workflows
  };

  if (options.format === 'json') {
    io.log(JSON.stringify(result, null, 2));
  } else {
    io.log('Codex workflow smoke:');
    for (const workflow of workflows) {
      io.log(`- ${workflow.workflow}: ${workflow.status}`);
      for (const failure of workflow.failures) {
        io.log(`  FAIL ${failure.path} - ${failure.message}`);
      }
    }
  }

  return {
    exitCode: result.ok ? 0 : 1,
    result
  };
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const { exitCode } = smokeCodexWorkflows({ format: args.format });
  process.exit(exitCode);
}

module.exports = {
  smokeCodexWorkflows
};
