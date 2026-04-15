const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  const filePath = path.join('/Users/pero/kosodate-map/public', req.url === '/' ? '/banner-preview.html' : req.url);
  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const types = { '.html':' text/html; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
    const ct = types[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3333, () => console.log('Banner server running on port 3333'));
