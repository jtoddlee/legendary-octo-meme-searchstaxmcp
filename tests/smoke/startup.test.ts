import { describe, expect, it } from 'vitest';
import { createServer } from '../../src/server.js';
import type { SearchStaxClient } from '../../src/searchstax/types.js';

const mockClient: SearchStaxClient = {
  async search() {
    return { documents: [], total: 0 };
  }
};

describe('startup', () => {
  it('creates an MCP server instance', () => {
    const server = createServer(mockClient);
    expect(server).toBeDefined();
  });
});
