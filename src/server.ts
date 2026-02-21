import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SearchStaxClient } from './searchstax/types.js';
import { handleSearchstaxSearch, searchstaxSearchInputSchema } from './tools/searchstaxSearch.js';

export function createServer(client: SearchStaxClient): McpServer {
  const server = new McpServer({
    name: 'searchstax-mcp-server',
    version: '0.1.0'
  });

  server.tool(
    'searchstax_search',
    'Query SearchStax in read-only mode',
    searchstaxSearchInputSchema.shape,
    async (args) => handleSearchstaxSearch(client, args)
  );

  return server;
}
