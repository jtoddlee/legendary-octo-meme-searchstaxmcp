import express from 'express';
import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

export function createHttpApp(mcpServer: McpServer) {
  const app = express();
  app.use(express.json());

  const transports = new Map<string, StreamableHTTPServerTransport>();

  function createTransport() {
    let transport: StreamableHTTPServerTransport;

    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId: string) => {
        transports.set(sessionId, transport);
      }
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        transports.delete(transport.sessionId);
      }
    };

    return transport;
  }

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.post('/mcp', async (req, res) => {
    const sessionId = req.header('mcp-session-id');
    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (!transport) {
      transport = createTransport();
      await mcpServer.connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
  });

  app.get('/mcp', async (req, res) => {
    const sessionId = req.header('mcp-session-id');
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({ error: 'Missing or invalid mcp-session-id' });
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(400).json({ error: 'Invalid session' });
      return;
    }

    await transport.handleRequest(req, res);
  });

  app.delete('/mcp', async (req, res) => {
    const sessionId = req.header('mcp-session-id');
    if (!sessionId) {
      res.status(400).json({ error: 'Missing mcp-session-id' });
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: 'Unknown session' });
      return;
    }

    await transport.handleRequest(req, res);
  });

  return app;
}
