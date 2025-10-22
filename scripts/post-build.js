// Post build: add timestamp to main assets and rewrite index.html references
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const assetsDir = path.join(dist, 'assets');
const ts = new Date();
const pad = (n)=> String(n).padStart(2,'0');
const stamp = `${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;

function renameWithStamp(file, prefix){
  const dir = path.dirname(file);
  const ext = path.extname(file);
  const base = path.basename(file, ext);
  const newBase = `${prefix}.${stamp}${ext}`;
  const target = path.join(dir, newBase);
  fs.renameSync(file, target);
  return path.basename(target);
}

if (!fs.existsSync(dist)) process.exit(0);

// Find built files
const files = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
const entryJs = files.find(f => /^main\.[a-f0-9]+\.js$/.test(f));
const css = files.find(f => /^styles\.[a-f0-9]+\.css$/.test(f));

let newJs = entryJs, newCss = css;
if (entryJs) newJs = renameWithStamp(path.join(assetsDir, entryJs), 'main');
if (css) newCss = renameWithStamp(path.join(assetsDir, css), 'styles');

// Rewrite index.html references
const indexPath = path.join(dist, 'index.html');
if (fs.existsSync(indexPath)){
  let html = fs.readFileSync(indexPath, 'utf8');
  if (entryJs) html = html.replace(entryJs, newJs);
  if (css) html = html.replace(css, newCss);
  fs.writeFileSync(indexPath, html, 'utf8');
}

console.log(`[post-build] stamped: js=${newJs || '-'} css=${newCss || '-'}`);

