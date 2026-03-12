#!/usr/bin/env node
/**
 * Validate skill directories have SKILL.md with required structure
 */

const fs = require('fs');
const path = require('path');
const { readMarkdownFile, hasMarkdownHeading } = require('./markdown-utils');
const {
  ACTIVE_TOOL_TARGETS,
  VALID_HOOK_MODES,
  loadSkillMetadata
} = require('../lib/skill-metadata');

const DEFAULT_SKILLS_DIR = path.join(__dirname, '../../skills');
const DEFAULT_RULES_DIR = path.join(__dirname, '../../rules');
const WHEN_TO_SECTION_REGEX = /^#{1,6}\s+When to (Use|Activate)\b/im;

function validateRequiredRule(rulePath, rulesDir, io, skillName) {
  const normalizedRulePath = rulePath.replace(/\\/g, '/');
  if (normalizedRulePath.startsWith('/') || normalizedRulePath.includes('..')) {
    io.error(`ERROR: ${skillName}/skill.meta.json - Invalid rule path '${rulePath}'`);
    return true;
  }

  const resolvedRule = path.join(rulesDir, ...normalizedRulePath.split('/'));
  if (!fs.existsSync(resolvedRule)) {
    io.error(`ERROR: ${skillName}/skill.meta.json - Missing referenced rule '${rulePath}'`);
    return true;
  }

  return false;
}

function validateRequiredSkills(requires, skillsDir, io, skillName) {
  let hasErrors = false;
  for (const requiredSkill of requires.skills) {
    const requiredSkillDir = path.join(skillsDir, requiredSkill);
    if (!fs.existsSync(path.join(requiredSkillDir, 'SKILL.md'))) {
      io.error(`ERROR: ${skillName}/skill.meta.json - Missing referenced skill '${requiredSkill}'`);
      hasErrors = true;
    }
  }
  return hasErrors;
}

function validateHookRuntime(runtime, io, skillName) {
  let hasErrors = false;

  if (!VALID_HOOK_MODES.has(runtime.hooks.mode)) {
    io.error(`ERROR: ${skillName}/skill.meta.json - Invalid hooks.mode '${runtime.hooks.mode}'`);
    hasErrors = true;
  }

  for (const toolName of runtime.hooks.tools) {
    if (!ACTIVE_TOOL_TARGETS.has(toolName)) {
      io.error(`ERROR: ${skillName}/skill.meta.json - hooks.tools contains unsupported target '${toolName}'`);
      hasErrors = true;
    }
  }

  if (runtime.hooks.mode === 'required' && runtime.hooks.tools.length === 0) {
    io.error(`ERROR: ${skillName}/skill.meta.json - hooks.tools must be provided when hooks.mode is 'required'`);
    hasErrors = true;
  }

  if (runtime.hooks.mode === 'none' && runtime.hooks.tools.length > 0) {
    io.error(`ERROR: ${skillName}/skill.meta.json - hooks.tools must be empty when hooks.mode is 'none'`);
    hasErrors = true;
  }

  return hasErrors;
}

function validateSkillRequires(skillMetadata, rulesDir, skillsDir, io) {
  if (!skillMetadata.hasMetaFile) {
    return false;
  }

  let hasErrors = false;
  const { requires, name } = skillMetadata;
  for (const rulePath of requires.rules) {
    hasErrors = validateRequiredRule(rulePath, rulesDir, io, name) || hasErrors;
  }

  hasErrors = validateRequiredSkills(requires, skillsDir, io, name) || hasErrors;
  hasErrors = validateHookRuntime(requires.runtime, io, name) || hasErrors;
  return hasErrors;
}

function validateSkillDocument(skillMd, io, dir) {
  let content;
  try {
    content = readMarkdownFile(skillMd);
  } catch (err) {
    io.error(`ERROR: ${dir}/SKILL.md - ${err.message}`);
    return { hasErrors: true, content: null };
  }

  if (content.trim().length === 0) {
    io.error(`ERROR: ${dir}/SKILL.md - Empty file`);
    return { hasErrors: true, content: null };
  }
  if (!hasMarkdownHeading(content)) {
    io.error(`ERROR: ${dir}/SKILL.md - Missing markdown heading`);
    return { hasErrors: true, content: null };
  }
  if (!WHEN_TO_SECTION_REGEX.test(content)) {
    io.error(`ERROR: ${dir}/SKILL.md - Missing required section: "When to Use" or "When to Activate"`);
    return { hasErrors: true, content: null };
  }

  return { hasErrors: false, content };
}

function validateSkillDirectory(dir, skillsDir, rulesDir, io) {
  const skillMd = path.join(skillsDir, dir, 'SKILL.md');
  if (!fs.existsSync(skillMd)) {
    io.error(`ERROR: ${dir}/ - Missing SKILL.md`);
    return { hasErrors: true, valid: false };
  }

  const documentResult = validateSkillDocument(skillMd, io, dir);
  if (documentResult.hasErrors) {
    return { hasErrors: true, valid: false };
  }

  try {
    const skillMetadata = loadSkillMetadata(path.join(skillsDir, dir));
    return {
      hasErrors: validateSkillRequires(skillMetadata, rulesDir, skillsDir, io),
      valid: true
    };
  } catch (err) {
    io.error(`ERROR: ${dir}/skill.meta.json - ${err.message}`);
    return { hasErrors: true, valid: false };
  }
}

function validateSkills(options = {}) {
  const skillsDir = options.skillsDir || DEFAULT_SKILLS_DIR;
  const rulesDir = options.rulesDir || DEFAULT_RULES_DIR;
  const io = options.io || { log: console.log, error: console.error };
  if (!fs.existsSync(skillsDir)) {
    io.log('No skills directory found, skipping validation');
    return { exitCode: 0, validCount: 0, hasErrors: false };
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
  let hasErrors = false;
  let validCount = 0;

  for (const dir of dirs) {
    const result = validateSkillDirectory(dir, skillsDir, rulesDir, io);
    hasErrors = result.hasErrors || hasErrors;
    if (result.valid) validCount++;
  }

  if (hasErrors) {
    return { exitCode: 1, validCount, hasErrors: true };
  }

  io.log(`Validated ${validCount} skill directories`);
  return { exitCode: 0, validCount, hasErrors: false };
}

if (require.main === module) {
  const result = validateSkills();
  process.exit(result.exitCode);
}

module.exports = {
  validateSkills
};
