import { createServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import { closeDemoServer, startPreferredDemoServer } from '../scripts/demo-server.mjs';

function listenOnRandomPort() {
  return new Promise((resolve, reject) => {
    const server = createServer((_request, response) => {
      response.end('occupied');
    });

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address === 'string') {
        reject(new Error('Test blocker server did not bind'));
        return;
      }

      resolve({ server, port: address.port });
    });
  });
}

describe('startPreferredDemoServer', () => {
  it('falls back to a free port when the preferred port is occupied', async () => {
    const blocker = await listenOnRandomPort();

    try {
      const demo = await startPreferredDemoServer(blocker.port);

      try {
        expect(demo.usedFallbackPort).toBe(true);
        expect(demo.requestedPort).toBe(blocker.port);
        expect(new URL(demo.baseUrl).port).not.toBe(String(blocker.port));
      } finally {
        await closeDemoServer(demo.server);
      }
    } finally {
      await closeDemoServer(blocker.server);
    }
  });
});
