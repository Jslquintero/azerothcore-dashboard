const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

marked.setOptions({ headerIds: false, mangle: false });

function getModulesDir() {
  const root = process.env.AC_PROJECT_ROOT;
  if (!root) return null;
  return path.join(root, 'modules');
}

function listModules() {
  const dir = getModulesDir();
  if (!dir || !fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => ({
      dirName: d.name,
      displayName: d.name.replace(/^mod-/, ''),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function getModuleReadme(dirName) {
  const dir = getModulesDir();
  if (!dir) return { html: null };

  // Prevent directory traversal
  const safeName = path.basename(dirName);
  const readmePath = path.join(dir, safeName, 'README.md');

  try {
    const content = fs.readFileSync(readmePath, 'utf-8');
    return { html: marked.parse(content) };
  } catch {
    return { html: null };
  }
}

module.exports = { listModules, getModuleReadme };
