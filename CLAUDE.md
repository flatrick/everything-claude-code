# CLAUDE.md

This file is the Claude-specific entrypoint for working in this repository.

## Shared Repo Guidance

Read [AGENTS.md](AGENTS.md) first.

That file is the shared source of truth for:

- repo working rules
- development workflow
- testing and security expectations
- cross-tool documentation policy

## Claude-Specific Details

For durable Claude capability and integration details, use:

- [docs/tools/claude-code.md](docs/tools/claude-code.md)
- [docs/supported-tools.md](docs/supported-tools.md)

Claude-native note:

- `CLAUDE.md` is a real Claude guidance surface, so keep this file as a thin
  Claude entrypoint that points back to shared repo guidance rather than
  duplicating repository rules here.

## Verification

When changing code in this repo, use the normal repo verification flow unless
the task explicitly calls for something narrower:

```bash
npm run lint
npm test
npm run test:verbose
```

`npm test` writes detailed JSONL run artifacts under `.artifacts/logs/test-runs/` and only prints the actionable summary by default.
