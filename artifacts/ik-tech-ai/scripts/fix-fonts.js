// Run after `expo export`. Cloudflare drops folders named "node_modules",
// which makes the icon fonts disappear (icons show as empty boxes).
// This renames that folder to "vendor" and fixes every path that points to it.
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(process.argv[2] || 'dist');
const assetsDir = path.join(outDir, 'assets');
const TEXT_EXT = new Set(['.js', '.html', '.json', '.css', '.map', '.txt']);

if (!fs.existsSync(outDir)) {
  console.error('[fix-fonts] Output folder not found:', outDir);
  process.exit(1);
}

let renamed = 0;
for (const name of ['node_modules', '__node_modules']) {
  const from = path.join(assetsDir, name);
  if (fs.existsSync(from)) {
    const to = path.join(assetsDir, 'vendor');
    if (fs.existsSync(to)) fs.rmSync(to, { recursive: true, force: true });
    fs.renameSync(from, to);
    renamed += 1;
    console.log(`[fix-fonts] renamed assets/${name} -> assets/vendor`);
  }
}

let edited = 0;
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!TEXT_EXT.has(path.extname(entry.name))) continue;
    const text = fs.readFileSync(full, 'utf8');
    const fixed = text
      .split('assets/__node_modules').join('assets/vendor')
      .split('assets/node_modules').join('assets/vendor');
    if (fixed !== text) { fs.writeFileSync(full, fixed); edited += 1; }
  }
};
walk(outDir);
console.log(`[fix-fonts] done: ${renamed} folder(s) renamed, ${edited} file(s) updated`);
