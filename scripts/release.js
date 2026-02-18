#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get current version from package.json
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const currentVersion = pkg.version;

// Parse command line args for version bump type
const bumpType = process.argv[2] || 'patch';

// Calculate new version
const versionParts = currentVersion.split('.').map(Number);
let newVersion;

switch (bumpType) {
  case 'major':
    newVersion = `${versionParts[0] + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${versionParts[0]}.${versionParts[1] + 1}.0`;
    break;
  case 'patch':
  default:
    newVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`;
    break;
}

// Or allow explicit version
if (process.argv[2] && process.argv[2].match(/^\d+\.\d+\.\d+$/)) {
  newVersion = process.argv[2];
}

console.log(`\n📦 Releasing: ${currentVersion} → ${newVersion}\n`);

// Update package.json
pkg.version = newVersion;
fs.writeFileSync(
  path.join(__dirname, '..', 'package.json'),
  JSON.stringify(pkg, null, 2) + '\n'
);

// Commit the version change
console.log('✅ Updating package.json...');
execSync('git add package.json', { stdio: 'inherit' });
execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });

// Create and push tag
console.log(`\n🏷️  Creating tag v${newVersion}...`);
execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { stdio: 'inherit' });
execSync('git push --follow-tags', { stdio: 'inherit' });

console.log(`\n✨ Release v${newVersion} is on its way!`);
console.log('🔗 Check the GitHub Actions for build progress.\n');
