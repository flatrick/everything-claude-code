# Codex Windows Sandbox Root-Child ACL Issue

This note documents a Windows-specific Codex sandbox failure mode seen when `apply_patch` works in a workspace root and in established sibling directories, but later fails inside some direct children of the workspace root with:

```text
windows sandbox: setup refresh failed with status exit code: 1
```

## Summary

The observed failure is not explained by a missing inherited `Modify` ACE on the target file. The tighter pattern is:

- patching in the workspace root succeeds
- patching in an established direct child such as `docs/` succeeds
- patching can create a new direct child directory once
- a later patch into that same direct child can fail during the Windows sandbox refresh step
- nested directories under a healthy parent continue to work

The most reliable local mitigation found so far is to stamp explicit sandbox `Modify` ACEs on each direct child directory of the workspace root instead of relying only on inherited sandbox ACEs from the root.

## Verification Boundary

This issue must be verified in a real Codex session with real `apply_patch` calls.

The following are useful supporting checks, but they are not sufficient on their own:

- `Get-Acl`
- `icacls`
- temporary read/write/delete probe scripts such as `verify-workspace-permissions.mjs`
- JavaScript or shell tests that edit files without going through Codex's internal patch path

If the problem report is specifically about `apply_patch`, the final pass/fail signal must come from `apply_patch`.

## Scope

This note is intentionally specific to:

- Codex on Windows
- `apply_patch`
- direct children of the active workspace root

It does not claim the same behavior for:

- nested paths under a healthy direct child
- other vendors' sandboxes
- arbitrary NTFS ACL problems

## Reproduction

The reproduction below avoids any special repo-local folders such as `.git`.

1. Start from a Windows workspace where `apply_patch` works at the workspace root.
2. Use `apply_patch` to create a brand-new direct child of the workspace root and one file in it.
3. Run `apply_patch` again against that same direct child.
4. Observe that the second patch can fail with `windows sandbox: setup refresh failed with status exit code: 1`.
5. Repeat the same experiment inside a nested directory under an existing healthy sibling such as `docs/` and observe that repeated patches continue to work there.

Example pattern:

```text
1. apply_patch -> fresh-patch-dir/file.txt      => PASS
2. apply_patch -> fresh-patch-dir/second.txt    => FAIL
3. apply_patch -> docs/sandbox-owned-subdir/a   => PASS
4. apply_patch -> docs/sandbox-owned-subdir/b   => PASS
```

## Supporting Inspection

Compare a known-good direct child of the workspace root with a failing one.

Useful Windows commands:

```powershell
whoami
whoami /groups
Get-Acl C:\path\to\workspace
Get-Acl C:\path\to\workspace\docs | Format-List Owner,AccessToString
Get-Acl C:\path\to\workspace\fresh-patch-dir | Format-List Owner,AccessToString
icacls C:\path\to\workspace\docs
icacls C:\path\to\workspace\fresh-patch-dir
```

Things to look for during inspection:

- the failing path is a direct child of the workspace root
- the failing path often has only inherited sandbox ACEs, or an incomplete explicit sandbox ACE set
- healthy direct children tend to carry explicit sandbox ACEs for both:
  - the sandbox user principal, often ending in `CodexSandboxOffline`
  - the sandbox group principal, often ending in `CodexSandboxUsers`

The exact domain or machine prefix will vary by computer.

## Why Inherited ACLs Are Not Enough Here

Normal NTFS inheritance should often be sufficient for access checks, but this failure occurs during Codex's Windows sandbox setup refresh step rather than during a plain file open. In the observed cases, inherited `Modify` access on the child directory was not enough to keep `apply_patch` working reliably for direct children of the workspace root.

This is why the repair script in this bundle does not try to reset owners or broadly rewrite ACLs. It only stamps explicit sandbox `Modify` ACEs onto direct child directories that should remain patchable.

## Repair

Run the following from an **elevated PowerShell terminal outside any sandbox** (right-click PowerShell → "Run as administrator", or run as the workspace owner).

**Step 1 — discover the sandbox principals on your machine:**

```powershell
Get-Acl "C:\path\to\workspace" | Select-Object -ExpandProperty Access |
    Where-Object { $_.IdentityReference -match 'Codex' } |
    Select-Object IdentityReference, FileSystemRights, IsInherited
```

Look for entries whose `IdentityReference` ends in `CodexSandboxOffline` (the user principal) and `CodexSandboxUsers` (the group principal). The exact domain or machine prefix varies per computer.

**Step 2 — preview the change (WhatIf):**

```powershell
$workspace = "C:\path\to\workspace"
$user  = "MACHINE\CodexSandboxOffline"   # replace MACHINE with your actual prefix
$group = "MACHINE\CodexSandboxUsers"     # replace MACHINE with your actual prefix

Get-ChildItem $workspace -Directory |
    Where-Object { $_.Name -notin @('.git', 'node_modules') } |
    ForEach-Object { Write-Host "Would stamp: $($_.FullName)" }
```

**Step 3 — apply explicit Modify ACEs to all direct child directories:**

```powershell
$workspace = "C:\path\to\workspace"
$user  = "MACHINE\CodexSandboxOffline"   # replace MACHINE with your actual prefix
$group = "MACHINE\CodexSandboxUsers"     # replace MACHINE with your actual prefix

Get-ChildItem $workspace -Directory |
    Where-Object { $_.Name -notin @('.git', 'node_modules') } |
    ForEach-Object {
        icacls $_.FullName /grant "${user}:(OI)(CI)M" /grant "${group}:(OI)(CI)M"
    }
```

`(OI)(CI)M` grants Modify with ObjectInherit and ContainerInherit, matching the explicit ACE shape Codex expects.

If `icacls` reports access denied, rerun from an elevated session or as the workspace owner.

## Post-Repair Verification

After the script runs:

1. Re-run `icacls` on the repaired direct child directory and confirm explicit sandbox ACEs are present.
2. Retry `apply_patch` against that direct child in a real Codex session.
3. Confirm that a second `apply_patch` into that same direct child succeeds.
4. Confirm that nested paths under that child still work as expected.

## Limitations

- This is a targeted repair for the direct-child Windows sandbox refresh issue.
- It is not a generic ACL reset tool.
- It intentionally does not remove explicit `Deny` ACEs from protected paths.
- If you intentionally hardened `.git` or another child with `Deny` rules, leave that child excluded unless you explicitly want to change it.
