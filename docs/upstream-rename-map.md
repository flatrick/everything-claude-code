# MDT To ECC Rename Map

This is the retained MDT-to-ECC comparison surface.

Use it for:
- translating MDT names to upstream ECC names
- checking whether an upstream ECC improvement has an MDT equivalent
- comparing MDT behavior with upstream without treating upstream docs as current MDT truth

Do not use this page as current-state MDT product documentation.

## Mapping Notes

- keep this page focused on name and concept translation
- do not duplicate current install or capability claims here
- if a comparison note becomes current MDT truth, move that truth into `docs/` and keep only the translation here

## Current Mapping

| ECC / upstream path or concept | MDT path or concept | Notes |
|---|---|---|
| `scripts/install-ecc.js` | `scripts/install-mdt.js` | MDT installs through the public `mdt` CLI surface |
| `Everything Claude Code` | `ModelDev Toolkit (MDT)` | MDT is multi-tool and not Claude-only |
| Claude-centric install/runtime docs | `docs/INSTALLATION.md`, `docs/supported-tools.md`, `docs/tools/` | Current-state MDT docs live under `docs/` |
| ECC naming and upstream comparison work | this page | Keep comparison here rather than spreading it across current docs |
