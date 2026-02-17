const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.AC_PROJECT_ROOT;
const OVERRIDE_PATH = path.join(PROJECT_ROOT, 'docker-compose.override.yml');

/**
 * Parse the docker-compose.override.yml into structured sections.
 * Preserves comments, grouping, and inline hints.
 *
 * Returns: {
 *   sections: [
 *     {
 *       name: "Individual Progression",
 *       vars: [
 *         { key: "AC_EXPANSION", value: "2", hint: "0,1,2", type: "number" },
 *         { key: "AC_ENABLE_PLAYER_SETTINGS", value: "1", hint: "", type: "toggle" },
 *       ]
 *     },
 *     ...
 *   ],
 *   raw: "<full file contents>"
 * }
 */
function parseOverride() {
  const raw = fs.readFileSync(OVERRIDE_PATH, 'utf-8');
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
    //   Also handles: AC_VAR:  "value" #hint
    //   And commented-out vars: #AC_VAR: "value"
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
  const raw = fs.readFileSync(OVERRIDE_PATH, 'utf-8');
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

  fs.writeFileSync(OVERRIDE_PATH, result.join('\n'), 'utf-8');
}

module.exports = { parseOverride, saveOverride };
