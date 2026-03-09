# Claude Code Manual Verification

This page is a prepared manual-verification stub for Claude Code.

Use it to record human-run checks for Claude-specific MDT behavior that cannot be fully proven by unit tests or static validation.

## Current Status

- Stub only
- Expand this page when Claude-specific runtime behavior needs a repeatable human verification checklist

## Likely Future Sections

- fresh install verification under `.claude/`
- hook execution and hook side effects
- session summary persistence
- continuous-learning observation capture
- continuous-learning observer runtime
- manual checks for Claude-native commands, agents, and memory behavior

## Notes

- Keep this page focused on behavior that must be verified inside a real Claude Code session
- Keep CLI-first checks in [docs/tools/local-verification.md](../../tools/local-verification.md)
