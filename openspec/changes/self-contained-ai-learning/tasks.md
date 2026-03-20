## 1. Canonical Runtime Layout

- [ ] 1.1 Move the shared ai-learning runtime core under `skills/ai-learning/` and update direct callers.
- [ ] 1.2 Remove duplicate Codex runtime content after porting any unique metadata or config into additive files.
- [ ] 1.3 Replace ai-learning internal path fallback chains with stable skill-relative imports.

## 2. Analyzer Runtime Behavior

- [ ] 2.1 Change `mdt learning analyze` to use runtime-controlled stdin or bounded temp-file payload delivery.
- [ ] 2.2 Add fallback user-visible error reporting for non-zero analyze exits with empty subprocess output.
- [ ] 2.3 Review timeout behavior so analysis is not killed prematurely by the outer CLI.

## 3. Verification

- [ ] 3.1 Update or add tests for canonical runtime location, additive overlay boundaries, and temp-copy/install-path loading.
- [ ] 3.2 Re-run dependency-sidecar and install-closure validation after the runtime move.
- [ ] 3.3 Verify analysis behavior in at least one hook-enabled context and one hook-free context.
