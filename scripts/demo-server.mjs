import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../examples/demo-site');

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
]);

export function startDemoServer(port = 0) {
  return new Promise((resolve, reject) => {
    const server = createServer(async (request, response) => {
      const requestUrl = new URL(request.url ?? '/', 'http://localhost');
      const pathname = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
      const filePath = path.resolve(root, '.' + pathname);

      if (!filePath.startsWith(root + path.sep)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      try {
        const body = await readFile(filePath);
        response.writeHead(200, {
          'content-type': contentTypes.get(path.extname(filePath)) ?? 'application/octet-stream',
          'cache-control': 'no-store',
        });
        response.end(body);
      } catch {
        response.writeHead(404);
        response.end('Not found');
      }
    });

    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address === 'string') {
        reject(new Error('Demo server did not bind'));
        return;
      }

      resolve({
        server,
        baseUrl: 'http://127.0.0.1:' + address.port,
      });
    });
  });
}

export function closeDemoServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const port = Number(process.env.PORT ?? 4173);
  const { baseUrl } = await startDemoServer(port);

  process.stdout.write(
    '\nSlice demo site\n\n' +
      '  Landing  ' + baseUrl + '/\n' +
      '  Broken   ' + baseUrl + '/broken.html\n' +
      '  Fixed    ' + baseUrl + '/fixed.html\n\n' +
      'Open the Broken page and resize the browser below ~744px to see the horizontal overflow.\n' +
      'In another terminal run:\n\n' +
      '  npm run demo:scan\n\n' +
      'Press Ctrl-C to stop the server.\n',
  );
}
