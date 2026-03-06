#!/usr/bin/env node
/**
 * Validate rule markdown files
 */

const fs = require('fs');
const path = require('path');
const { readMarkdownFile, hasMarkdownHeading, stripFrontmatter } = require('./markdown-utils');

const DEFAULT_RULES_DIR = path.join(__dirname, '../../rules');

function hasRuleBodyContent(content) {
  const withoutFrontmatter = stripFrontmatter(content);
  const withoutHeadings = withoutFrontmatter
    .split(/\r?\n/)
    .filter(line => !/^#{1,6}\s+/.test(line))
    .join('\n')
    .trim();
  return withoutHeadings.length > 0;
}

function validateRules(options = {}) {
  const rulesDir = options.rulesDir || DEFAULT_RULES_DIR;
  const io = options.io || { log: console.log, error: console.error };
  if (!fs.existsSync(rulesDir)) {
    io.log('No rules directory found, skipping validation');
    return { exitCode: 0, validatedCount: 0, hasErrors: false };
  }

  const files = fs.readdirSync(rulesDir, { recursive: true })
    .filter(f => f.endsWith('.md'));
  let hasErrors = false;
  let validatedCount = 0;

  for (const file of files) {
    const filePath = path.join(rulesDir, file);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;

      const content = readMarkdownFile(filePath);
      if (content.trim().length === 0) {
        io.error(`ERROR: ${file} - Empty rule file`);
        hasErrors = true;
        continue;
      }
      if (!hasMarkdownHeading(content)) {
        io.error(`ERROR: ${file} - Missing markdown heading`);
        hasErrors = true;
        continue;
      }
      if (!hasRuleBodyContent(content)) {
        io.error(`ERROR: ${file} - Missing rule content below heading`);
        hasErrors = true;
        continue;
      }
      validatedCount++;
    } catch (err) {
      io.error(`ERROR: ${file} - ${err.message}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    return { exitCode: 1, validatedCount, hasErrors: true };
  }

  io.log(`Validated ${validatedCount} rule files`);
  return { exitCode: 0, validatedCount, hasErrors: false };
}

if (require.main === module) {
  const result = validateRules();
  process.exit(result.exitCode);
}

module.exports = {
  hasRuleBodyContent,
  validateRules
};
