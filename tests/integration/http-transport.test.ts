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
    const app = createHttpApp(createServer(client));
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Server failed to bind');
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/healthz`);
    expect(response.status).toBe(200);
    server.close();
  });
});
