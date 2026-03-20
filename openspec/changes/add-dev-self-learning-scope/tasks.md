## 1. Dev Install Marker

- [ ] 1.1 Define the authoritative dev-install marker that runtime helpers will use to decide whether `.self` is eligible.
- [ ] 1.2 Materialize that marker during `--dev` installs without changing the normal install baseline.

## 2. Learning Scope Selection

- [ ] 2.1 Update ai-learning project-detection/runtime helpers so explicit project-root signals still win over `.self`.
- [ ] 2.2 Route MDT-repo learning into `~/.{tool}/mdt/homunculus/.self/` when the install is dev-marked and no explicit project-root override applies.
- [ ] 2.3 Keep non-MDT repos and non-dev installs on the existing project-scoped fallback path.

## 3. Verification

- [ ] 3.1 Add tests for `.self` activation, precedence, and non-dev fallback behavior.
- [ ] 3.2 Update current docs only after the `.self` contract is implemented and locally verified.
