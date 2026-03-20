## Context

The repo already has two different hardening concepts:

- shared workspace hardening under `hardening/`, installed under every tool's `mdt/hardening/`
- Codex-specific home hardening under `codex-template/hardening/`, currently focused on `auth.json`

The backlog idea of "harden tool home directories for all supported tools" conflates those concepts. Before implementation, MDT needs a discovery pass that defines which tool-home files are sensitive, what hardening action is appropriate, and how optional operator-invoked home hardening should differ from normal install behavior.

## Goals / Non-Goals

**Goals:**
- Inventory and classify candidate sensitive files in current tool homes.
- Define the boundary between workspace hardening and tool-home hardening.
- Decide whether future tool-home hardening remains optional and operator-invoked.
- Produce a concrete implementation-ready follow-up contract if the audit supports it.

**Non-Goals:**
- Do not implement Claude or Cursor home hardening yet.
- Do not broaden normal installs to mutate sensitive home files by default.
- Do not treat workspace hardening as proof that tool-home hardening is solved.

## Decisions

### Discovery comes before cross-tool implementation
MDT will not replicate the Codex home-hardening bundle across tools until the exact sensitive-file surface is verified per tool.

Alternative considered: copy the Codex pattern immediately to Claude and Cursor.
Rejected because the existing Codex bundle is narrowly tailored to `auth.json` and does not prove equivalent sensitive-file contracts for other tools.

### Tool-home hardening stays separate from workspace hardening
Workspace hardening and tool-home hardening are different operator workflows and must remain separate in docs and implementation.

Alternative considered: collapse them into one generic hardening feature.
Rejected because workspace probes verify effective workspace access, while home hardening mutates sensitive user-home files.

### Assume optional until proven otherwise
Until the discovery pass is complete, tool-home hardening should be treated as an optional operator workflow rather than part of normal install or `--dev`.

Alternative considered: make home hardening part of install.
Rejected because modifying sensitive user-home state by default would be too strong without a verified per-tool contract.

## Risks / Trade-offs

- Discovery may reveal that tools differ too much for a shared implementation shape -> Mitigation: allow per-tool apply/verify scripts while keeping a common contract vocabulary.
- Sensitive-file audits can drift quickly with tool updates -> Mitigation: require local verification and keep the change discovery-oriented until a validated baseline exists.
- Operators may expect hardening immediately after seeing the proposal -> Mitigation: state clearly that this change does not implement cross-tool hardening yet.

## Migration Plan

1. Audit current sensitive base-state files for Claude, Cursor, and Codex homes.
2. Classify each file as harden directly, verify only, or leave untouched.
3. Define the operator surface and distribution model for any future implementation.
4. If the audit is strong enough, create one or more follow-up implementation changes.

## Open Questions

- Which Claude and Cursor base-state files, if any, are equivalent in sensitivity to Codex `auth.json`.
- Whether future tool-home hardening belongs under shared `mdt/hardening/`, tool-template `hardening/`, or a mixed model.
- Whether verification should be purely read-only for some tools even if apply scripts exist for others.
