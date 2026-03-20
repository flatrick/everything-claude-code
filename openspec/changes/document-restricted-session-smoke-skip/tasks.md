## 1. Verification Guidance

- [ ] 1.1 Update local verification guidance to explain restricted-session `SKIP` results for smoke tool-setup probes.
- [ ] 1.2 Update the relevant manual verification pages to explain rerun guidance for environment-blocked smoke probes.

## 2. Workflow Alignment

- [ ] 2.1 Align workflow documentation so `mdt-dev-smoke` can explicitly represent inconclusive environment-blocked probes as `SKIP`.
- [ ] 2.2 Verify the documented wording matches the actual `EPERM`/`EACCES` handling already implemented in the smoke runner.

## 3. Validation

- [ ] 3.1 Re-run the targeted smoke-runner tests that cover blocked process spawn behavior.
- [ ] 3.2 Confirm current docs no longer treat restricted-session `SKIP` as ambiguous.
