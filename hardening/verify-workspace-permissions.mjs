#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDetectEnv() {
  const candidates = [
    path.join(__dirname, "..", "scripts", "lib", "detect-env.js"),
    path.join(__dirname, "..", "..", "mdt", "scripts", "lib", "detect-env.js")
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    `Cannot find detect-env.js. Searched:\n${candidates.map((candidate) => `  - ${candidate}`).join("\n")}`
  );
}

const { createDetectEnv } = loadDetectEnv();
const args = process.argv.slice(2);

function readArg(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1 || index === args.length - 1) {
    return fallback;
  }
  return args[index + 1];
}

function hasFlag(name) {
  return args.includes(name);
}

function parseFormat() {
  const inline = args.find((arg) => arg.startsWith("--format="));
  if (inline) {
    return inline.split("=")[1] || "text";
  }
  return readArg("--format", "text");
}

function createProbeResult(workspacePath) {
  return {
    workspacePath,
    exists: false,
    isDirectory: false,
    platform: process.platform,
    workspace: null,
    checks: {
      read: { ok: false, detail: "not-run" },
      write: { ok: false, detail: "not-run" },
      delete: { ok: false, detail: "not-run" }
    },
    ok: false
  };
}

function setFailure(check, message) {
  return { ok: false, detail: message };
}

function setSuccess(message) {
  return { ok: true, detail: message };
}

function getWorkspaceInfo(workspacePath) {
  const detectEnv = createDetectEnv();
  return detectEnv.getWorkspaceInfo(workspacePath);
}

function verifyReadAccess(targetPath) {
  try {
    fs.accessSync(targetPath, fs.constants.R_OK);
    fs.readdirSync(targetPath);
    return setSuccess("directory is readable");
  } catch (error) {
    return setFailure("read", `read probe failed: ${error.code || error.message}`);
  }
}

function removeProbeFile(probePath, probeName) {
  try {
    fs.unlinkSync(probePath);
    return setSuccess(`temporary file removed: ${probeName}`);
  } catch (error) {
    return setFailure("delete", `delete probe failed: ${error.code || error.message}`);
  }
}

function verifyWriteAccess(targetPath) {
  const probeName = `.mdt-permission-probe-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`;
  const probePath = path.join(targetPath, probeName);

  try {
    fs.accessSync(targetPath, fs.constants.W_OK);
    fs.writeFileSync(probePath, `probe ${new Date().toISOString()}\n`, "utf8");
    return {
      write: setSuccess(`temporary file created: ${probeName}`),
      delete: removeProbeFile(probePath, probeName)
    };
  } catch (error) {
    return {
      write: setFailure("write", `write probe failed: ${error.code || error.message}`),
      delete: setFailure("delete", "delete probe skipped because write probe failed")
    };
  }
}

function runVerification(targetPath) {
  const resolvedPath = path.resolve(targetPath || process.cwd());
  const result = createProbeResult(resolvedPath);
  result.workspace = getWorkspaceInfo(resolvedPath);

  if (!fs.existsSync(resolvedPath)) {
    result.checks.read = setFailure("read", "workspace does not exist");
    result.checks.write = setFailure("write", "workspace does not exist");
    result.checks.delete = setFailure("delete", "workspace does not exist");
    return result;
  }

  result.exists = true;

  try {
    result.isDirectory = fs.statSync(resolvedPath).isDirectory();
  } catch (error) {
    result.checks.read = setFailure("read", `stat failed: ${error.code || error.message}`);
    result.checks.write = setFailure("write", "write probe skipped because stat failed");
    result.checks.delete = setFailure("delete", "delete probe skipped because stat failed");
    return result;
  }

  if (!result.isDirectory) {
    result.checks.read = setFailure("read", "workspace path is not a directory");
    result.checks.write = setFailure("write", "workspace path is not a directory");
    result.checks.delete = setFailure("delete", "workspace path is not a directory");
    return result;
  }

  result.checks.read = verifyReadAccess(resolvedPath);
  const writeChecks = verifyWriteAccess(resolvedPath);
  result.checks.write = writeChecks.write;
  result.checks.delete = writeChecks.delete;
  result.ok = result.checks.read.ok && result.checks.write.ok && result.checks.delete.ok;
  return result;
}

function renderText(result) {
  const lines = [
    `[workspace-permissions] path=${result.workspacePath}`,
    `[workspace-permissions] platform=${result.platform}`,
    `[workspace-permissions] workspace-kind=${result.workspace.workspaceKind}`,
    `[workspace-permissions] read=${result.checks.read.ok ? "OK" : "FAIL"} - ${result.checks.read.detail}`,
    `[workspace-permissions] write=${result.checks.write.ok ? "OK" : "FAIL"} - ${result.checks.write.detail}`,
    `[workspace-permissions] delete=${result.checks.delete.ok ? "OK" : "FAIL"} - ${result.checks.delete.detail}`
  ];

  if (result.workspace.shouldWarnPerformance) {
    lines.push("[workspace-permissions] WARN - WSL mounted workspace detected under /mnt/<drive>/; performance may be significantly worse than a Linux-native path.");
  }

  lines.push(`[workspace-permissions] overall=${result.ok ? "OK" : "FAIL"}`);
  return lines.join("\n");
}

function main() {
  const workspacePath = readArg("--workspace", process.cwd());
  const format = parseFormat();
  const result = runVerification(workspacePath);

  if (format === "json" || hasFlag("--json")) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderText(result)}\n`);
  }

  process.exit(result.ok ? 0 : 1);
}

main();
