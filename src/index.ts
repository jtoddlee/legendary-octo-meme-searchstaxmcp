import { loadConfig } from './config.js';
import { createHttpApp } from './http.js';
import { createSearchStaxClient } from './searchstax/client.js';
import { createServer } from './server.js';

const config = loadConfig(process.env);

const client = createSearchStaxClient({
  baseUrl: config.SEARCHSTAX_BASE_URL,
  apiToken: config.SEARCHSTAX_API_TOKEN,
  timeoutMs: config.HTTP_TIMEOUT_MS,
  retries: config.HTTP_RETRIES
});

const mcpServer = createServer(client);
const app = createHttpApp(mcpServer);

app.listen(config.PORT, () => {
  // Keep startup message short and avoid secret output.
  console.log(`searchstax-mcp-server listening on :${config.PORT}`);
});
