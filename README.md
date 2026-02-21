# SearchStax MCP Server

Read-only MCP server that allows Codex CLI to query SearchStax through an Azure-hosted Streamable HTTP endpoint.

## Environment
Required:
- `SEARCHSTAX_BASE_URL`
- `SEARCHSTAX_API_TOKEN`

Optional:
- `HTTP_TIMEOUT_MS` (default `8000`)
- `HTTP_RETRIES` (default `1`)
- `PORT` (default `3000`)

## Run locally
```bash
npm install
npm run dev
```

Health check:
```bash
curl http://127.0.0.1:3000/healthz
```

## Verify
```bash
npm test
npm run build
docker build -t searchstax-mcp:dev .
bash scripts/smoke-http.sh
```

## Docs
- Azure deploy: `docs/azure-deployment.md`
- Codex CLI proxy wiring: `docs/codex-cli-mcp-proxy.md`
- Design: `docs/plans/2026-02-21-searchstax-mcp-design.md`
- Implementation plan: `docs/plans/2026-02-21-searchstax-mcp-implementation.md`
