import { createReadStream } from 'node:fs';
import { lstat, realpath } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const realRoot = await realpath(root);
const port = Number(process.env.PORT || 4173);
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const requested = pathname === '/' ? '/index.html' : pathname;
    const filename = path.resolve(root, `.${requested}`);
    const relative = path.relative(root, filename);
    const file = await lstat(filename);
    const realFilename = await realpath(filename);
    const realRelative = path.relative(realRoot, realFilename);
    if (
      relative.startsWith('..')
      || path.isAbsolute(relative)
      || realRelative.startsWith('..')
      || path.isAbsolute(realRelative)
      || file.isSymbolicLink()
      || !file.isFile()
    ) {
      throw new Error('Not found');
    }
    const headers = {
      'Accept-Ranges': 'bytes',
      'Cache-Control': requested.startsWith('/audio/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-store',
      'Content-Type': contentTypes[path.extname(filename)] || 'application/octet-stream',
    };
    let start = 0;
    let end = file.size - 1;
    let statusCode = 200;
    const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
    if (request.headers.range && !range) {
      response.writeHead(416, { ...headers, 'Content-Range': `bytes */${file.size}` });
      response.end();
      return;
    }
    if (range) {
      start = range[1] === '' ? Math.max(0, file.size - Number(range[2])) : Number(range[1]);
      end = range[2] === '' ? file.size - 1 : Number(range[2]);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= file.size) {
        response.writeHead(416, { ...headers, 'Content-Range': `bytes */${file.size}` });
        response.end();
        return;
      }
      end = Math.min(end, file.size - 1);
      statusCode = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${file.size}`;
    }
    headers['Content-Length'] = String(end - start + 1);
    response.writeHead(statusCode, headers);
    if (request.method === 'HEAD') response.end();
    else createReadStream(filename, { start, end }).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Scratch Lessons test server listening on http://127.0.0.1:${port}`);
});

const close = () => server.close(() => process.exit(0));
process.on('SIGINT', close);
process.on('SIGTERM', close);
