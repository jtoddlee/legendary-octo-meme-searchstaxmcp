import express from 'express';
import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

interface SessionState {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
}

export function createHttpApp(createServer: () => McpServer) {
  const app = express();
  app.use(express.json());

  const sessions = new Map<string, SessionState>();

  function createSession() {
    let transport: StreamableHTTPServerTransport;
    const server = createServer();

    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId: string) => {
        sessions.set(sessionId, { transport, server });
      }
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        sessions.delete(transport.sessionId);
      }
    };

    return { transport, server };
  }

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.post('/mcp', async (req, res) => {
    try {
      const sessionId = req.header('mcp-session-id');
      let session = sessionId ? sessions.get(sessionId) : undefined;

      if (!session) {
        session = createSession();
        await session.server.connect(session.transport);
      }

      await session.transport.handleRequest(req, res, req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown MCP POST error';
      res.status(500).json({ error: message });
    }
  });

  app.get('/mcp', async (req, res) => {
    try {
      const sessionId = req.header('mcp-session-id');
      if (!sessionId || !sessions.has(sessionId)) {
        res.status(400).json({ error: 'Missing or invalid mcp-session-id' });
        return;
      }

      const session = sessions.get(sessionId);
      if (!session) {
        res.status(400).json({ error: 'Invalid session' });
        return;
      }

      await session.transport.handleRequest(req, res);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown MCP GET error';
      res.status(500).json({ error: message });
    }
  });

  app.delete('/mcp', async (req, res) => {
    try {
      const sessionId = req.header('mcp-session-id');
      if (!sessionId) {
        res.status(400).json({ error: 'Missing mcp-session-id' });
        return;
      }

      const session = sessions.get(sessionId);
      if (!session) {
        res.status(404).json({ error: 'Unknown session' });
        return;
      }

      await session.transport.handleRequest(req, res);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown MCP DELETE error';
      res.status(500).json({ error: message });
    }
  });

  return app;
}
