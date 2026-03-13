# Workspace Permission Verification Prompt

Use this prompt when you want an MDT-installed agent to verify whether the current sandbox identity can actually work in the target workspace before attempting edits.

## Prompt

```text
Inspect my current workspace and verify whether the sandboxed agent has the read/write permissions needed to work safely here.

Requirements:

1. Inspect first. Do not guess.
2. Verify the active workspace path and whether the environment is native Windows, WSL, Linux, or macOS.
3. If running under WSL, classify whether the workspace is Linux-native or a Windows-mounted path such as /mnt/c/...
4. Verify that the current sandbox identity can:
   - read the workspace directory
   - create a temporary probe file in the workspace
   - delete that temporary probe file
5. If the active tool is Codex on native Windows and the operator is reporting an `apply_patch` failure, do not stop at raw filesystem probes. Perform a disposable real `apply_patch` verification:
   - create a new direct child of the workspace root with `apply_patch`
   - run `apply_patch` a second time into that same direct child
   - compare that result with a repeated `apply_patch` inside a nested directory under an existing healthy direct child such as `docs/`
6. If access checks fail, inspect the current identity and current permission state:
   - On Windows: use whoami, whoami /groups, Get-Acl, attrib, and icacls
   - On Linux/macOS: use whoami, id, ls -ld, stat, and getfacl if available
7. If the Codex-on-Windows `apply_patch` probe fails but raw filesystem probes succeed, explain that this is a Codex sandbox-path verification issue rather than a plain read/write denial.
8. Do not change any permissions yourself.
9. Return:
   - a short verdict on whether the agent can safely work in this workspace
   - whether the verdict is based on raw filesystem probes only or on a real Codex `apply_patch` probe
   - the exact commands the operator should run to grant the minimum needed permissions
   - verification commands to rerun afterward
10. Never use destructive ACL resets or inheritance-removal patterns that would change unrelated users' access unless I explicitly ask for that.

If the workspace is under WSL on /mnt/<drive>/..., include a warning that performance may be significantly worse than using a Linux-native path under /home/<user>/...
```

## Notes

- This is a verification-and-remediation workflow, not an autonomous ACL-changing workflow.
- The operator runs any returned permission-changing commands.
- On Codex for Windows, raw filesystem probes can be a false positive for `apply_patch` health. The internal patch path must be tested when that is the reported failure.
