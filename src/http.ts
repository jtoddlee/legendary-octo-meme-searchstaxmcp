import express from 'express';
import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { SearchStaxClient } from './searchstax/types.js';
import { SearchStaxError } from './errors.js';

interface SessionState {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
}

interface GptActionOptions {
  client: SearchStaxClient;
  apiKey: string;
}

const gptSearchSchema = z.object({
  query: z.string().min(1),
  rows: z.number().int().min(1).max(100).default(10),
  start: z.number().int().min(0).optional(),
  model: z.string().min(1).optional(),
  fq: z.array(z.string().min(1)).optional()
});

export function createHttpApp(createServer: () => McpServer, gptActions?: GptActionOptions) {
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

  if (gptActions) {
    app.get('/gpt-actions/openapi.json', (_req, res) => {
      res.status(200).json({
        openapi: '3.1.0',
        info: {
          title: 'SearchStax GPT Action API',
          version: '1.0.0'
        },
        servers: [{ url: '/' }],
        paths: {
          '/gpt-actions/search': {
            post: {
              operationId: 'searchstaxSearch',
              summary: 'Search SearchStax index',
              security: [{ internalApiKey: [] }],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['query'],
                      properties: {
                        query: { type: 'string', minLength: 1 },
                        rows: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
                        start: { type: 'integer', minimum: 0 },
                        model: { type: 'string', minLength: 1 },
                        fq: { type: 'array', items: { type: 'string', minLength: 1 } }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Search results'
                },
                '400': {
                  description: 'Validation error'
                },
                '401': {
                  description: 'Unauthorized'
                },
                '502': {
                  description: 'Upstream SearchStax error'
                }
              }
            }
          }
        },
        components: {
          schemas: {},
          securitySchemes: {
            internalApiKey: {
              type: 'apiKey',
              in: 'header',
              name: 'X-Internal-Api-Key'
            }
          }
        }
      });
    });

    app.post('/gpt-actions/search', async (req, res) => {
      const apiKey = req.header('x-internal-api-key');
      if (!apiKey || apiKey !== gptActions.apiKey) {
        res.status(401).json({
          error: {
            code: 'unauthorized',
            message: 'Missing or invalid API key'
          }
        });
        return;
      }

      const parsed = gptSearchSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: 'validation_error',
            message: 'Invalid request body',
            issues: parsed.error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message
            }))
          }
        });
        return;
      }

      try {
        const result = await gptActions.client.search(parsed.data);
        res.status(200).json({
          query: parsed.data.query,
          numFound: result.total,
          start: parsed.data.start ?? 0,
          rows: parsed.data.rows,
          docs: result.documents,
          rawTookMs: result.rawTookMs
        });
      } catch (error) {
        const message = error instanceof SearchStaxError ? error.message : 'Search request failed';
        res.status(502).json({
          error: {
            code: 'upstream_error',
            message
          }
        });
      }
    });
  }

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
