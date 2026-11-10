const http = require('http');
const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '..', 'web-build');

const MIME_TYPES = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function resolveFile(urlPath) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(urlPath);
  } catch {
    return null;
  }

  const relativePath = path
    .normalize(decodedPath)
    .replace(/^([/\\])+/, '')
    .replace(/^(\.\.(\/|\\|$))+/, '');
  const candidate = path.resolve(WEB_ROOT, relativePath);

  if (!candidate.startsWith(`${WEB_ROOT}${path.sep}`) && candidate !== WEB_ROOT) {
    return null;
  }

  return candidate;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let filePath = resolveFile(url.pathname);

  if (!filePath) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(WEB_ROOT, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('The web app has not been built yet.');
    return;
  }

  const contentType =
    MIME_TYPES[path.extname(filePath).toLowerCase()] ||
    'application/octet-stream';
  res.writeHead(200, {
    'content-type': contentType,
    'x-content-type-options': 'nosniff',
  });
  fs.createReadStream(filePath).pipe(res);
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => {
  console.log(`IK TECH AI web app listening on port ${port}`);
});
