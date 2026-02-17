const fs = require('fs');
const path = require('path');

function getOverridePath() {
  const root = process.env.AC_PROJECT_ROOT || '';
  return path.join(root, 'docker-compose.override.yml');
}

/**
 * Parse the docker-compose.override.yml into structured sections.
 * Preserves comments, grouping, and inline hints.
 */
function parseOverride() {
  const overridePath = getOverridePath();
  const raw = fs.readFileSync(overridePath, 'utf-8');
  const lines = raw.split('\n');

  const sections = [];
  let currentSection = null;
  let inEnvironment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect we're inside the environment: block
    if (/^\s*environment:\s*$/.test(line)) {
      inEnvironment = true;
      continue;
    }

    // Detect we've left the environment block (next top-level key like volumes:)
    if (inEnvironment && /^\s{4}\w/.test(line) && !line.includes(':') === false && !/^\s{6}/.test(line)) {
      // If indentation is 4 spaces (same as environment:) it's a sibling key
      if (/^\s{4}[a-z]/.test(line)) {
        inEnvironment = false;
        continue;
      }
    }

    if (!inEnvironment) continue;

    // Skip blank lines
    if (!trimmed) continue;

    // Section header comment: "# Section Name"
    const sectionMatch = trimmed.match(/^#\s+(.+)$/);
    if (sectionMatch) {
      currentSection = { name: sectionMatch[1].trim(), vars: [] };
      sections.push(currentSection);
      continue;
    }

    // Environment variable line: AC_VAR: "value" # optional comment
    const varMatch = trimmed.match(
      /^(#?)([A-Z][A-Z0-9_]+):\s*"([^"]*)"(?:\s*#(.*))?$/
    );
    if (varMatch && currentSection) {
      const [, commented, key, value, inlineComment] = varMatch;
      const hint = inlineComment ? inlineComment.trim() : '';

      // Determine field type
      let type;
      if (value === '0' || value === '1') {
        // Check if hint suggests it's a range (like "0,1,2")
        if (hint && /\d.*,.*\d/.test(hint)) {
          type = 'number';
        } else {
          type = 'toggle';
        }
      } else if (/^\d+$/.test(value)) {
        type = 'number';
      } else {
        type = 'text';
      }

      currentSection.vars.push({
        key,
        value,
        hint,
        type,
        disabled: !!commented,
      });
      continue;
    }

    // If we get a line with less indentation than env vars, we've left
    if (!/^\s{6}/.test(line) && trimmed && !trimmed.startsWith('#')) {
      inEnvironment = false;
    }
  }

  return { sections, raw };
}

/**
 * Save updated environment variables back to the override file.
 * Preserves file structure — only modifies values of existing env vars.
 *
 * @param {Object} updates - { "AC_VAR": "newValue", ... }
 */
function saveOverride(updates) {
  const overridePath = getOverridePath();
  const raw = fs.readFileSync(overridePath, 'utf-8');
  const lines = raw.split('\n');
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Match env var lines (including commented-out ones)
    const varMatch = trimmed.match(
      /^(#?)([A-Z][A-Z0-9_]+):\s*"([^"]*)"(.*)$/
    );

    if (varMatch) {
      const [, commented, key, , trailing] = varMatch;
      if (key in updates) {
        // Preserve the original indentation
        const indent = line.match(/^(\s*)/)[1];
        result.push(`${indent}${commented}${key}: "${updates[key]}"${trailing}`);
        continue;
      }
    }

    result.push(line);
  }

  fs.writeFileSync(overridePath, result.join('\n'), 'utf-8');
}

module.exports = { parseOverride, saveOverride };
