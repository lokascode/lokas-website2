const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const apiHandlers = {
  '/api/admin': require('./api/admin'),
  '/api/education': require('./api/education'),
  '/api/inquiries': require('./api/inquiries'),
  '/api/media': require('./api/media'),
};

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
    req.on('error', reject);
  });
}

function createResponse(res) {
  return {
    statusCode: 200,
    setHeader(name, value) { res.setHeader(name, value); },
    status(code) { this.statusCode = code; return this; },
    json(payload) {
      res.statusCode = this.statusCode;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(payload));
    },
  };
}

async function handleApi(req, res, pathname, search) {
  const handler = apiHandlers[pathname];
  if (!handler) return false;
  req.url = pathname + search;
  req.body = await readBody(req);
  try {
    await handler(req, createResponse(res));
  } catch (error) {
    console.error('[v0] API handler error:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }
  return true;
}

function safeFilePath(urlPath) {
  const decoded = decodeURIComponent(urlPath === '/' ? '/index.html' : urlPath);
  const filePath = path.resolve(root, `.${decoded}`);
  return filePath.startsWith(root) ? filePath : null;
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (await handleApi(req, res, requestUrl.pathname, requestUrl.search)) return;

  const filePath = safeFilePath(requestUrl.pathname);
  if (!filePath) {
    res.statusCode = 400;
    return res.end('Bad request');
  }
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    res.setHeader('Content-Type', mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, () => console.log(`[v0] Lokas server listening on ${port}`));
