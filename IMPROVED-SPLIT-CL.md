# Improved Continuous Learning Extraction Plan

## Purpose
This document replaces the earlier `continuous-learning-core` split proposal.

The revised recommendation is:

- keep `continuous-learning-manual` and `continuous-learning-automatic` as the
  only public skills
- move shared implementation into a private runtime module under
  `scripts/lib/continuous-learning/`
- preserve existing public entrypoints while removing duplicated runtime
  ownership

The goal is to stop treating `continuous-learning-manual` as both a public skill
surface and the real backend implementation, without introducing a third
user-visible skill that adds installer, validator, and documentation complexity.

## Desired End State
After the extraction:

- shared continuous-learning implementation lives in one private runtime module
- `continuous-learning-manual` remains the public explicit/manual command
  surface
- `continuous-learning-automatic` remains the Claude/Cursor hook surface
- no public `continuous-learning-core` skill exists
- existing user-facing paths remain stable during the migration
- duplicated implementations are removed from:
  - `skills/continuous-learning-manual/`
  - `skills/continuous-learning-automatic/`
  - `codex-template/skills/continuous-learning-manual/`
- package installation behavior stays low-risk:
  - Claude installs `continuous-learning-manual` and
    `continuous-learning-automatic`
  - Cursor installs `continuous-learning-manual` and
    `continuous-learning-automatic`
  - Codex installs `continuous-learning-manual`

## Why This Is Better Than A Public Core Skill
The earlier split was directionally right about ownership, but the public-core
skill approach creates avoidable costs:

1. it adds a third public skill that users and agents can discover even though
   it is infrastructure, not a real workflow surface
2. it forces package manifests, installers, tests, validators, and docs to
   model that extra public abstraction
3. it creates rollout risk because consumers can be rewired to `core` before
   installs actually include `core`
4. it does not solve the real problem by itself, which is duplicated runtime
   code across multiple public and overlay directories

The private-runtime approach fixes the ownership issue while keeping the public
surface small and stable.

## Design Principles

### 1. Shared implementation is private infrastructure
Anything that is not inherently a public skill surface should live under
`scripts/lib/continuous-learning/`, not in a new installable skill.

### 2. Public skills expose workflows, not backend ownership
`continuous-learning-manual` should document and expose explicit/manual
workflows.

`continuous-learning-automatic` should document and expose hook-driven
observation workflows.

Neither should be the long-term owner of shared backend code.

### 3. Stable public entrypoints matter more than perfect internal paths
Keep current command and script entrypoints working while the implementation is
rewired behind them.

### 4. Fix contract drift before moving code
The current docs do not fully match actual behavior. Freeze the real contract in
tests and docs before or during extraction so the migration does not move stale
assumptions into a new location.

### 5. Keep installer semantics narrow in this migration
Do not widen Codex shared-skill inheritance behavior in the same change. That is
separate work with separate blast radius.

### 6. Remove duplication only after wrappers and tests are green
Switch real implementations first. Trim duplicate files only after installed
layouts and runtime behavior are verified.

## Important Constraints From Current Repo Behavior

### Runtime scripts already have a private install surface
The installer already copies `scripts/lib/` and `scripts/hooks/` into the tool
runtime root under `<tool-config>/mdt/scripts/`.

That means shared continuous-learning runtime code can be moved into
`scripts/lib/continuous-learning/` without inventing a new public skill surface.

### Codex still does not inherit top-level shared package skills
Current installer behavior excludes top-level package `skills` for Codex and
only installs `tools.codex.skills`.

This means the migration should not rely on new shared skill selection semantics
for Codex.

### Codex overlay installation merges shared and overlay directories
Codex installs merge shared skills with `codex-template/skills/` overlays.

That means:

- shared `continuous-learning-manual` files can still provide the main public
  surface
- the overlay should only retain true Codex-specific differences plus metadata
  that current validators require

### Validator behavior still treats overlay metadata conservatively
If a Codex overlay directory exists for a skill, current package validation
checks the overlay-resolved directory for `skill.meta.json`.

That means overlay metadata cannot be dropped until validator behavior is
intentionally changed and tested.

### Current docs and code disagree on some core behavior
The current implementation preserves cwd-scoped non-git project fallback, while
some docs still describe a global fallback model.

The current implementation also uses the existing project ID behavior from code,
while some docs still describe 12-character `sha256` identifiers.

The manual skill docs also still contain stale hook examples even though the
hook surface belongs to `continuous-learning-automatic`.

These mismatches are in scope for correction as part of the migration.

## Decision Log
These decisions should be treated as defaults for the migration:

- do not create a public `continuous-learning-core` skill
- extract shared implementation into `scripts/lib/continuous-learning/`
- keep existing public command and script entrypoints stable during migration
- keep current Codex shared-skill installer semantics unchanged
- treat `continuous-learning-manual` as the public explicit/manual CLI surface
  across supported tools, not as the shared backend owner
- treat `continuous-learning-automatic` as a thin hook surface only
- migrate the optional Codex observer in the same program of work
- keep overlay metadata until validators are deliberately updated

## Proposed Ownership Model

### `scripts/lib/continuous-learning/`
This becomes the single owner of shared implementation.

Recommended contents:

- project detection implementation
- shared config loading helpers
- instinct CLI internals
- retrospective generation logic
- observer runtime helpers
- shared observer prompt/assets
- any shared path-resolution helpers

This module is private runtime infrastructure, not a user-facing skill.

### `skills/continuous-learning-manual/`
This remains a public skill.

It should own:

- `SKILL.md`
- `skill.meta.json`
- public explicit/manual entrypoints such as `scripts/codex-learn.js`
- public CLI wrappers such as `scripts/instinct-cli.js`
- compatibility wrappers for any temporarily preserved paths

It should document:

- explicit/manual learning workflows
- public commands and when to use them
- how the public manual commands relate to the automatic hook layer

It should not remain the real owner of shared runtime code.

### `skills/continuous-learning-automatic/`
This remains a public skill.

It should own:

- `SKILL.md`
- `skill.meta.json`
- `hooks/observe.js`
- only thin wrappers that are truly needed for compatibility

It should document:

- hook-based observation for Claude/Cursor
- required hook wiring
- what is intentionally not owned here

It should not remain the owner of shared project detection or shared backend
logic.

### `codex-template/skills/continuous-learning-manual/`
This should contain only true Codex-specific differences plus currently required
metadata.

Initial safe target contents:

- `SKILL.md`
- `skill.meta.json`
- `agents/openai.yaml`
- any other Codex-only metadata required by current validation
- only Codex-specific wrappers or docs that cannot live in shared
  `skills/continuous-learning-manual/`

It should not keep duplicated shared implementations after the migration is
complete.

## File-Level Refactor Plan

### Phase 0: Freeze The Real Contract

#### 1. Correct contract drift in docs and tests
Review and update the current continuous-learning docs and tests so they reflect
real behavior before the extraction continues.

Correct at minimum:

- non-git fallback behavior
- project ID behavior
- ownership of hook entrypoints
- stale public examples that point to nonexistent manual hook paths

Acceptance criteria:

- core docs no longer contradict current code on project detection behavior
- manual docs no longer claim ownership of hook entrypoints
- tests encode the real current contract before extraction

### Phase 1: Extract Shared Runtime

#### 2. Create the private shared runtime module
Add `scripts/lib/continuous-learning/` and move shared implementation there.

Initial candidates:

- project detection logic
- shared config loading
- retrospective generation logic
- shared observer helpers
- shared CLI internals that do not need to remain public entrypoints

Acceptance criteria:

- one private runtime location owns shared implementation
- no new public skill is introduced

#### 3. Convert public entrypoints into thin wrappers
Update public scripts so they import or delegate to the private runtime instead
of owning real implementations themselves.

Targets include:

- `skills/continuous-learning-manual/scripts/instinct-cli.js`
- `skills/continuous-learning-manual/scripts/codex-learn.js`
- `skills/continuous-learning-manual/scripts/detect-project.js`
- `skills/continuous-learning-manual/scripts/retrospect-week.js`
- `skills/continuous-learning-manual/agents/start-observer.js`
- `skills/continuous-learning-automatic/hooks/observe.js`
- any automatic or overlay duplicates that still own real logic

Acceptance criteria:

- public paths keep working
- real implementation lives in the private runtime
- wrappers are minimal and explicit

#### 4. Rewire the optional Codex observer
Update `scripts/codex-observer.js` so it resolves the private runtime first.

If needed during transition, it may fall back to stable manual wrappers, but the
new preferred runtime owner should be private shared runtime code rather than the
manual skill directory.

Acceptance criteria:

- Codex observer behavior still works
- it no longer depends on manual being the backend owner

### Phase 2: Re-state Skill Boundaries

#### 5. Rewrite `continuous-learning-manual` docs around its real role
Update manual-skill docs so they describe:

- explicit/manual commands
- public CLI workflows
- the relationship to automatic observation

Remove:

- backend-ownership language
- stale hook-path examples
- any wording that says manual is the shared runtime owner

Acceptance criteria:

- manual is clearly a public workflow surface
- docs do not imply it owns the backend

#### 6. Rewrite `continuous-learning-automatic` docs around thin ownership
Update automatic-skill docs so they describe:

- hook capture
- hook prerequisites
- how hook events flow into shared runtime

Remove:

- duplicated backend explanations that belong elsewhere
- any implication that automatic owns project detection

Acceptance criteria:

- automatic is clearly a thin hook layer
- shared concepts are referenced without duplicating ownership claims

### Phase 3: Keep Install Composition Stable

#### 7. Preserve current package selection semantics
Do not add a new public skill to `packages/continuous-learning/package.json`.

The migration target remains:

- shared `skills`: `documentation-steward`, `continuous-learning-manual`
- `tools.claude.skills`: `continuous-learning-automatic`
- `tools.cursor.skills`: `continuous-learning-automatic`
- `tools.codex.skills`: `documentation-steward`, `continuous-learning-manual`

Acceptance criteria:

- no `continuous-learning-core` manifest entry exists
- current installer semantics remain valid

#### 8. Ensure runtime installation is sufficient
Verify that runtime installation already places the new private module under the
tool runtime root through the existing `scripts/lib` copy behavior.

Only change installer code if the new runtime location is not actually included
by current runtime-script installation.

Acceptance criteria:

- the new private runtime is installed anywhere the public wrappers need it
- no continuous-learning-specific installer special-case is introduced unless
  strictly necessary

### Phase 4: Update Commands, Docs, And Integrations

#### 9. Keep public command docs pointed at public manual entrypoints
Do not repoint command docs to private runtime paths.

Review and keep or refine public entrypoint usage in:

- `commands/evolve.md`
- `commands/instinct-export.md`
- `commands/instinct-import.md`
- `commands/instinct-status.md`
- `commands/projects.md`
- `commands/promote.md`

Acceptance criteria:

- user-facing commands still reference stable public scripts
- docs do not expose private runtime paths

#### 10. Update descriptive docs that describe ownership
Review files such as:

- `skills/continuous-learning-manual/SKILL.md`
- `skills/continuous-learning-automatic/SKILL.md`
- `docs/tools/codex.md`
- manual verification docs
- migration notes or parity docs

Replace wording that still treats manual as the backend owner.

Acceptance criteria:

- user-facing language matches the extracted architecture

### Phase 5: Trim Duplicate Implementations

#### 11. Remove duplicate implementations from automatic
After wrappers and tests are in place, remove duplicated shared logic from
automatic-owned scripts.

Key target:

- `skills/continuous-learning-automatic/scripts/detect-project.js`

Acceptance criteria:

- automatic no longer contains a second real copy of shared runtime logic

#### 12. Remove duplicated shared implementation from the Codex overlay
After installation and validator behavior are confirmed, remove duplicated
shared implementations from:

- `codex-template/skills/continuous-learning-manual/scripts/`
- `codex-template/skills/continuous-learning-manual/agents/`
- any duplicated shared config that can live in shared runtime or shared manual

Keep:

- Codex-specific docs
- Codex-specific metadata
- Codex-only wrappers if still necessary

Acceptance criteria:

- overlay contains true Codex differences only
- required metadata is still present

#### 13. Trim shared manual to its real public role
After the new runtime is stable, remove any remaining shared backend ownership
from `skills/continuous-learning-manual/` except:

- public wrappers
- public CLI entrypoints
- docs and metadata

Acceptance criteria:

- manual is small and understandable
- manual remains public surface, not backend owner

### Phase 6: Update Tests And Validators

#### 14. Add or update private-runtime tests
Add focused tests for:

- project detection behavior
- shared config loading
- retrospective behavior
- shared observer helper behavior

Acceptance criteria:

- the private runtime is directly tested
- shared behavior is no longer validated only through duplicated public files

#### 15. Keep compatibility tests for public entrypoints
Update tests so they distinguish between:

- shared runtime behavior tests
- public wrapper compatibility tests

At minimum verify:

- manual CLI entrypoints still work
- automatic hook entrypoint still works
- Codex observer still works

Acceptance criteria:

- tests protect both new ownership and stable public entrypoints

#### 16. Update install and validator expectations
Review and update:

- install tests
- validator tests
- package validation expectations

Expected install contract remains:

- Claude: `manual + automatic`
- Cursor: `manual + automatic`
- Codex: `manual`
- no public `continuous-learning-core`

Acceptance criteria:

- tests encode the unchanged public install contract
- validators still pass with overlay metadata preserved

### Phase 7: Documentation Sweep And Cleanup

#### 17. Sweep for stale backend-ownership references
Search for wording that still implies:

- manual owns the backend
- automatic owns project detection
- a public `continuous-learning-core` skill exists

Acceptance criteria:

- repo-wide ownership language is consistent

#### 18. Sweep for stale path references carefully
Search for old implementation-path references and decide case by case whether
they should:

- remain as stable public entrypoints
- move to a different public wrapper
- be removed because they expose private runtime details

Acceptance criteria:

- public docs only expose stable public paths
- private runtime paths are not leaked into command docs

## Recommended Delivery Strategy
This should still be a staged migration, but the stages need different
boundaries than the earlier plan.

### PR 1: Contract freeze and private runtime extraction
Scope:

- correct doc and test drift for current behavior
- add `scripts/lib/continuous-learning/`
- move shared implementation there
- turn existing public scripts into wrappers
- update `scripts/codex-observer.js`

Why first:

- this changes the real ownership model without introducing a new public skill
- it avoids the broken state where consumers are rewired before installs include
  the new backend owner

### PR 2: Skill-doc rewrite and test alignment
Scope:

- rewrite manual and automatic docs around the new boundaries
- update tests to distinguish private runtime from public wrappers
- update validators only where needed for the extracted architecture

Why second:

- once extraction is done, the docs and tests can describe the stable structure
  instead of a moving target

### PR 3: Duplicate removal and final cleanup
Scope:

- remove duplicated implementations from automatic
- trim the Codex overlay
- trim shared manual to public wrappers and docs only
- do final stale-reference cleanup

Why third:

- duplicate removal is safest after the new ownership model is already green

## Testing Plan

### Targeted automated tests
Run at minimum:

```bash
node tests/scripts/install-mdt-unit.test.js
node tests/scripts/install-mdt.test.js
node tests/scripts/detect-project.test.js
node tests/scripts/instinct-cli.test.js
node tests/scripts/codex-observer.test.js
node tests/scripts/continuous-learning-observer.test.js
node tests/scripts/continuous-learning-retrospective.test.js
node tests/hooks/cursor-lifecycle.test.js
node tests/ci/validators.test.js
```

Add focused tests for the new private runtime module as part of the extraction.

### Full suite
Before considering the refactor complete:

```bash
node tests/run-all.js
```

### Manual verification
Dry-run installs:

```bash
node scripts/install-mdt.js --target claude --dry-run continuous-learning
node scripts/install-mdt.js --target cursor --dry-run continuous-learning
node scripts/install-mdt.js --target codex --dry-run continuous-learning
node scripts/install-mdt.js --target codex --dry-run continuous-learning-observer
```

Expected results:

- Claude/Cursor still install `continuous-learning-manual` and
  `continuous-learning-automatic`
- Codex still installs `continuous-learning-manual`
- no dry-run mentions a public `continuous-learning-core` skill
- Codex observer dry-run still includes `codex-observer.js`

Also verify:

- automatic hooks still point at `skills/continuous-learning-automatic/hooks/observe.js`
- public instinct commands still work through stable public manual entrypoints
- public wrappers resolve shared behavior from private runtime
- `scripts/codex-observer.js` resolves shared behavior from private runtime or
  an intentional temporary wrapper during the transition
- installed Codex overlay still includes required metadata files

### Installed-layout verification
In addition to source-tree tests, verify installed layouts under temporary
override roots for each target:

- Claude override root contains:
  - `skills/continuous-learning-manual/`
  - `skills/continuous-learning-automatic/`
  - runtime scripts under `mdt/scripts/lib/continuous-learning/`
- Cursor override root contains:
  - `skills/continuous-learning-manual/`
  - `skills/continuous-learning-automatic/`
  - runtime scripts under `mdt/scripts/lib/continuous-learning/`
- Codex override root contains:
  - `skills/continuous-learning-manual/`
  - runtime scripts under `mdt/scripts/lib/continuous-learning/`
- Codex override root still contains any required overlay metadata files

## Risks And Mitigations

### Risk: Rewiring to private runtime breaks installed layouts
Mitigation:

- rely on the existing runtime-script install surface under `mdt/scripts/lib/`
- verify installed-layout tests in the same PR as extraction

### Risk: A new migration accidentally exposes private runtime paths to users
Mitigation:

- keep command docs pointed at stable public manual entrypoints
- treat private runtime paths as internal-only

### Risk: Automatic still owns a duplicated real implementation
Mitigation:

- explicitly remove duplicate ownership from automatic after wrappers are green
- add direct tests for private runtime instead of trusting duplicate files

### Risk: Codex overlay trimming breaks validation
Mitigation:

- keep overlay metadata until validators are deliberately changed
- trim shared implementation only after install and validator tests are green

### Risk: Current contract drift gets carried forward
Mitigation:

- fix doc and test drift in Phase 0
- use current code behavior as the source of truth for this migration

### Risk: Codex observer regresses independently
Mitigation:

- migrate `scripts/codex-observer.js` in the same extraction PR
- keep dedicated observer tests and dry-run verification

## Acceptance Checklist
- [ ] no public `continuous-learning-core` skill exists
- [ ] shared continuous-learning implementation lives in
      `scripts/lib/continuous-learning/`
- [ ] `continuous-learning-manual` is a public workflow surface, not the backend
      owner
- [ ] `continuous-learning-automatic` is a thin hook surface, not a second
      backend owner
- [ ] current package install behavior remains:
      Claude `manual + automatic`, Cursor `manual + automatic`, Codex `manual`
- [ ] public command and script entrypoints remain stable during migration
- [ ] `scripts/codex-observer.js` works with the extracted runtime
- [ ] duplicate implementations are removed from automatic
- [ ] duplicate shared implementations are removed from the Codex overlay
- [ ] required Codex overlay metadata is still present
- [ ] docs no longer misstate non-git fallback, hook ownership, or backend
      ownership
- [ ] tests and validators pass with updated expectations

## Recommended Implementation Order
Use this order to minimize breakage:

1. fix contract drift in docs and tests
2. create `scripts/lib/continuous-learning/`
3. move shared implementation there
4. convert public entrypoints into thin wrappers
5. update `scripts/codex-observer.js`
6. rewrite manual and automatic docs around the new ownership model
7. update tests and validators
8. remove duplicated implementations from automatic
9. remove duplicated shared implementation from the Codex overlay
10. do a final stale-reference sweep

## Practical Recommendation
Treat this as a 3-PR runtime extraction, not as a public-skill split.

The safest long-term structure is:

- private shared runtime in `scripts/lib/continuous-learning/`
- public explicit/manual surface in `skills/continuous-learning-manual/`
- public hook surface in `skills/continuous-learning-automatic/`

That structure fixes the real duplication problem, avoids introducing an
infrastructure skill as a user-facing concept, and fits the current installer
and validator architecture with much lower rollout risk.
