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

  it('requires api key for gpt action endpoint', async () => {
    const app = createHttpApp(() => createServer(client), {
      client,
      apiKey: 'secret'
    });
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Server failed to bind');
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/gpt-actions/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'brain' })
    });
    expect(response.status).toBe(401);
    server.close();
  });

  it('supports gpt action search with default rows', async () => {
    let capturedRows: number | undefined;
    const gptClient: SearchStaxClient = {
      async search(input) {
        capturedRows = input.rows;
        return { documents: [{ id: '1' }], total: 1, rawTookMs: 4 };
      }
    };

    const app = createHttpApp(() => createServer(gptClient), {
      client: gptClient,
      apiKey: 'secret'
    });
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Server failed to bind');
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/gpt-actions/search`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-api-key': 'secret'
      },
      body: JSON.stringify({ query: 'brain' })
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.numFound).toBe(1);
    expect(capturedRows).toBe(10);
    server.close();
  });

  it('serves OpenAPI schema for gpt actions', async () => {
    const app = createHttpApp(() => createServer(client), {
      client,
      apiKey: 'secret'
    });
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Server failed to bind');
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/gpt-actions/openapi.json`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.openapi).toBe('3.1.0');
    expect(body.paths['/gpt-actions/search']).toBeDefined();
    expect(body.components.schemas).toEqual({});
    server.close();
  });
});
