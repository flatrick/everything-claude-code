## Why

MDT already ships a shared workspace-hardening bundle for all tools and a Codex-specific optional home-hardening bundle, but there is no verified cross-tool contract for hardening sensitive base files in `~/.claude/`, `~/.cursor/`, and `~/.codex/`. The current backlog note is too vague to implement safely because it does not define which files are sensitive, what "hardening" means per tool, or whether the feature is optional or install-driven.

## What Changes

- Audit the sensitive base-state files in Claude, Cursor, and Codex homes that may need optional hardening.
- Define the boundary between shared workspace hardening and per-tool home hardening.
- Define what "harden directly", "verify only", and "leave untouched" mean for each current tool.
- Decide the operator surface for future implementation: apply scripts, verification scripts, prompts, and installation/distribution model.
- Do not implement cross-tool home hardening yet; this change is discovery and contract-shaping only.

## Capabilities

### New Capabilities

- `tool-home-hardening-discovery`: Defines the discovery contract for identifying, classifying, and scoping optional tool-home hardening across supported tools.

### Modified Capabilities

- `mdt-installation`: Clarify the boundary between normal installs, optional tool-home hardening, and the already-shipped shared workspace hardening bundle.
- `tool-setup-verification`: Clarify what verification can and cannot claim about optional home-hardening behavior before implementation exists.

## Impact

- Affected docs and design decisions around `hardening/`, `codex-template/hardening/`, and future tool-specific hardening bundles.
- Affected future installation and verification workflow for sensitive base-state files under tool home directories.
