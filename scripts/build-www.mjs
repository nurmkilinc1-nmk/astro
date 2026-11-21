import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'www');

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const skipNames = new Set([
  '.git',
  '.github',
  'node_modules',
  'www',
  'android',
  'ios',
  'scripts',
  'package.json',
  'package-lock.json',
  'capacitor.config.json',
  'sw.js',
  'README.md'
]);

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

for (const entry of fs.readdirSync(root)) {
  if (skipNames.has(entry) || entry.startsWith('.')) continue;
  copyRecursive(path.join(root, entry), path.join(outDir, entry));
}

console.log('www klasoru basariyla hazirlandi.');
