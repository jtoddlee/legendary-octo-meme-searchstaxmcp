import { describe, expect, it } from 'vitest';
import { createHttpApp } from '../../src/http.js';
import { createServer } from '../../src/server.js';
import type { SearchStaxClient } from '../../src/searchstax/types.js';

const client: SearchStaxClient = {
  async search() {
    return { documents: [], total: 0 };
  }
};

describe('http transport', () => {
  it('serves health endpoint', async () => {
    const app = createHttpApp(() => createServer(client));
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Server failed to bind');
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/healthz`);
    expect(response.status).toBe(200);
    server.close();
  });

  it('supports multiple independent initialize calls', async () => {
    const app = createHttpApp(() => createServer(client));
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Server failed to bind');
    }

    const initBody = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0' }
      }
    };

    const one = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream'
      },
      body: JSON.stringify(initBody)
    });
    expect(one.status).toBe(200);

    const two = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream'
      },
      body: JSON.stringify(initBody)
    });
    expect(two.status).toBe(200);

    server.close();
  });
});
