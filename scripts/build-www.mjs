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

// astronomy-engine kütüphanesini yerelleştir
const astroSrc = path.join(root, 'node_modules', 'astronomy-engine', 'astronomy.browser.min.js');
const vendorDir = path.join(outDir, 'vendor');
if (fs.existsSync(astroSrc)) {
  fs.mkdirSync(vendorDir, { recursive: true });
  fs.copyFileSync(astroSrc, path.join(vendorDir, 'astronomy.browser.min.js'));
}

// www içindeki HTML dosyalarında CDN ve viewport ayarını güncelle
for (const entry of fs.readdirSync(outDir)) {
  if (!entry.endsWith('.html')) continue;
  const filePath = path.join(outDir, entry);
  let html = fs.readFileSync(filePath, 'utf8');

  html = html.replace(
    /https:\/\/cdn\.jsdelivr\.net\/npm\/astronomy-engine[^"']*\/astronomy\.browser\.min\.js/g,
    'vendor/astronomy.browser.min.js'
  );

  html = html.replace(
    /<meta\s+name="viewport"\s+content="([^"]*)"\s*\/?>/i,
    (match, content) =>
      content.includes('viewport-fit=cover')
        ? match
        : `<meta name="viewport" content="${content}, viewport-fit=cover">`
  );

  html = html.replace(
  /<head>/i,
  `<head><script>if(localStorage.getItem('astro-theme')==='dark')document.documentElement.setAttribute('data-theme','dark');</script>`
);

if (!html.includes('js/app.js')) {
    html = html.replace(/<\/body>/i, '  <script src="js/app.js" defer></script>\n</body>');
  }
  
  html = html.replace(/href="\/favicon\.ico"/g, 'href="favicon.svg" type="image/svg+xml"');
  fs.writeFileSync(filePath, html, 'utf8');
}

console.log('www klasoru ve yerel varliklar basariyla hazirlandi.');
