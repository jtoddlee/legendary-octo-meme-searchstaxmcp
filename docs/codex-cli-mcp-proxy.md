# Codex CLI + mcp-proxy Setup

## Why proxy is needed
Codex CLI uses a local stdio MCP process. `mcp-proxy` bridges stdio to your remote Azure Streamable HTTP MCP endpoint.

## Install mcp-proxy
Use the official package instructions for your environment. Example with npm:

```bash
npm install -g mcp-proxy
```

## Configure Codex CLI MCP server
Add an MCP entry that starts `mcp-proxy` and points to your Azure endpoint.

Example command:

```bash
mcp-proxy --target "https://<your-container-app-fqdn>/mcp"
```

Use that command as the stdio MCP process in your Codex CLI MCP config.

## Connectivity check
1. Confirm remote health:
```bash
curl https://<your-container-app-fqdn>/healthz
```

2. Run Codex CLI and issue a prompt that should trigger `searchstax_search`.
3. Confirm proxy logs show MCP requests flowing to Azure.
