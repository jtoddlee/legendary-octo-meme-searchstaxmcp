# SearchStax MCP Server Design

Date: 2026-02-21
Status: Approved

## Goals
- Build an MCP integration so Codex CLI can query SearchStax.
- Keep SearchStax access read-only.
- Prefer established open source MCP components over custom protocol plumbing.
- Deploy server on Azure.

## Non-Goals (MVP)
- No write/update/delete SearchStax operations.
- No per-user credential delegation.
- No advanced analytics/reporting endpoints in first release.

## Decisions
- Runtime: Azure Container Apps.
- MCP transport at server: Streamable HTTP.
- Codex client connection: local stdio bridge via `mcp-proxy` forwarding to Azure endpoint.
- Auth model: single shared read-only SearchStax API token from Azure Key Vault.
- MVP tool surface: search/query only.

## Architecture
1. Codex CLI uses a local stdio MCP process (`mcp-proxy`).
2. `mcp-proxy` forwards MCP requests to Azure-hosted MCP server over Streamable HTTP.
3. MCP server executes read-only SearchStax query calls.
4. SearchStax responses are normalized and returned to Codex.

## Components
- `mcp-server` (repo code):
  - Exposes `searchstax_search` tool.
  - Validates input and enforces read-only operations.
  - Handles upstream timeouts/retries and error normalization.
- `mcp-proxy` (OSS):
  - Local stdio adapter used by Codex CLI.
- Azure Container Apps:
  - Hosts MCP server container.
- Azure Key Vault:
  - Stores `SEARCHSTAX_API_TOKEN` injected as secret env var.
- SearchStax API:
  - Upstream read-only search endpoint(s).

## Data Flow
1. User asks Codex a SearchStax question.
2. Codex CLI issues MCP tool call over stdio to local `mcp-proxy`.
3. `mcp-proxy` relays call to Azure Streamable HTTP endpoint.
4. MCP server calls SearchStax with read-only token.
5. Server returns structured results to Codex via proxy.

## Security
- Token stored only in Key Vault / runtime secrets; never committed.
- Authorization headers and secrets redacted in logs.
- Tool surface explicitly restricted to read-only search operations.
- Optional future network hardening: outbound allow-list to SearchStax host.

## Error Handling
- Map upstream errors into consistent categories:
  - `auth`
  - `rate_limit`
  - `timeout`
  - `upstream_error`
- Include safe diagnostic context (status code, request id if available).
- Configurable timeout and bounded retries.

## Testing Strategy
- Unit tests:
  - input validation
  - response normalization
  - error mapping
- Integration tests:
  - mocked SearchStax API client scenarios
- Smoke tests:
  - local MCP tool invocation path
- Post-deploy checks:
  - health endpoint
  - successful query
  - expected auth failure behavior

## Repository Deliverables
- MCP server scaffold and tool implementation.
- SearchStax API client abstraction.
- Config management for secrets and endpoints.
- Test suite and smoke scripts.
- Containerization and local run instructions.
- Azure deployment docs/scripts for guided setup.
- Codex CLI + `mcp-proxy` configuration example.

## Open Follow-Ups (Post-MVP)
- Add read-only metadata endpoints.
- Evaluate per-user auth passthrough.
- Add stronger network restrictions and observability dashboards.
