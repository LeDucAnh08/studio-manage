// Read-only player for the annotated recording captured by the album browser test.
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs/promises');
const root = path.resolve(__dirname, '../audit/drive-album-demo-2026-11-10');
http
  .createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const name = pathname === '/' ? 'demo.html' : decodeURIComponent(pathname.slice(1));
      if (!/^(?:demo\.html|steps\.json|step-\d\d\.png)$/.test(name)) {
        res.writeHead(404);
        res.end();
        return;
      }
      const bytes = await fs.readFile(path.join(root, name));
      res.writeHead(200, {
        'Content-Type': name.endsWith('.png')
          ? 'image/png'
          : name.endsWith('.json')
            ? 'application/json'
            : 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(bytes);
    } catch {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(4024, '127.0.0.1', () => console.log('Annotated album demo: http://127.0.0.1:4024'));
