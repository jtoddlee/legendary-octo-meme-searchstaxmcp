# SearchStax MCP Server Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production-ready MCP server that lets Codex CLI run read-only SearchStax queries through a local `mcp-proxy` bridge to an Azure-hosted Streamable HTTP endpoint.

**Architecture:** Implement a TypeScript MCP server using the official MCP SDK with a single `searchstax_search` tool and a small SearchStax client abstraction. Package as a container for Azure Container Apps, read token from environment (Key Vault injection), and provide test coverage for validation, API mapping, and error handling.

**Tech Stack:** Node.js 20, TypeScript, `@modelcontextprotocol/sdk`, `zod`, `vitest`, Docker, Azure Container Apps, Azure Key Vault.

---

### Task 1: Initialize project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/index.ts`
- Create: `src/server.ts`
- Create: `README.md`

**Step 1: Write the failing test**

Create `tests/smoke/startup.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createServer } from '../../src/server';

describe('startup', () => {
  it('creates an MCP server instance', () => {
    const server = createServer();
    expect(server).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/smoke/startup.test.ts`
Expected: FAIL with module/file not found.

**Step 3: Write minimal implementation**

- Add npm scripts: `build`, `dev`, `test`, `lint`.
- Add `createServer()` stub in `src/server.ts`.
- Add `src/index.ts` that starts server transport.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/smoke/startup.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add package.json tsconfig.json .gitignore src/index.ts src/server.ts README.md tests/smoke/startup.test.ts
git commit -m "chore: initialize typescript mcp server scaffold"
```

### Task 2: Add configuration and validation

**Files:**
- Create: `src/config.ts`
- Create: `tests/unit/config.test.ts`
- Modify: `src/index.ts`

**Step 1: Write the failing test**

Create tests for:
- missing `SEARCHSTAX_API_TOKEN` throws
- missing `SEARCHSTAX_BASE_URL` throws
- valid config returns parsed values

```ts
expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(/SEARCHSTAX_API_TOKEN/);
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/config.test.ts`
Expected: FAIL with `loadConfig` undefined.

**Step 3: Write minimal implementation**

Implement `loadConfig(env)` in `src/config.ts` using `zod`:
- `SEARCHSTAX_BASE_URL` (url)
- `SEARCHSTAX_API_TOKEN` (non-empty)
- optional `HTTP_TIMEOUT_MS` default `8000`
- optional `HTTP_RETRIES` default `1`

Update startup path to call `loadConfig`.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/config.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/config.ts src/index.ts tests/unit/config.test.ts
git commit -m "feat: add validated runtime configuration"
```

### Task 3: Implement SearchStax API client

**Files:**
- Create: `src/searchstax/client.ts`
- Create: `src/searchstax/types.ts`
- Create: `tests/unit/searchstax-client.test.ts`

**Step 1: Write the failing test**

Test client behavior:
- sends `Authorization: Bearer <token>`
- sends query parameters
- maps non-2xx to categorized error (`auth`, `rate_limit`, `upstream_error`)
- timeout maps to `timeout`

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/searchstax-client.test.ts`
Expected: FAIL with client module missing.

**Step 3: Write minimal implementation**

Implement `search(query, options)` using `fetch` with `AbortController` timeout and bounded retries. Return normalized structure:

```ts
{
  documents: Array<Record<string, unknown>>,
  total: number,
  rawTookMs?: number
}
```

Define typed error class `SearchStaxError` with `category` field.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/searchstax-client.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/searchstax/client.ts src/searchstax/types.ts tests/unit/searchstax-client.test.ts
git commit -m "feat: implement read-only SearchStax client with error mapping"
```

### Task 4: Add MCP tool contract and validation

**Files:**
- Create: `src/tools/searchstaxSearch.ts`
- Create: `tests/unit/tool-schema.test.ts`
- Modify: `src/server.ts`

**Step 1: Write the failing test**

Test tool input schema rejects invalid request and accepts valid request:
- required `query` string
- optional `rows` integer `1..100`
- optional `start` integer `>=0`

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/tool-schema.test.ts`
Expected: FAIL with missing schema/tool export.

**Step 3: Write minimal implementation**

- Define zod schema in `searchstaxSearch.ts`.
- Register MCP tool `searchstax_search` in `createServer()`.
- Wire handler to SearchStax client call.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/tool-schema.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/tools/searchstaxSearch.ts src/server.ts tests/unit/tool-schema.test.ts
git commit -m "feat: add searchstax_search MCP tool and input validation"
```

### Task 5: Tool response formatting and safe errors

**Files:**
- Create: `src/errors.ts`
- Create: `tests/unit/tool-handler.test.ts`
- Modify: `src/tools/searchstaxSearch.ts`

**Step 1: Write the failing test**

Test handler returns:
- structured success payload (`total`, `documents`)
- safe error payload with category and message
- no token leakage in output/log fields

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/tool-handler.test.ts`
Expected: FAIL for missing formatter/error mapper.

**Step 3: Write minimal implementation**

- Add central `toToolError` mapper.
- Convert upstream errors to stable categories.
- Redact sensitive values before returning error details.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/tool-handler.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/errors.ts src/tools/searchstaxSearch.ts tests/unit/tool-handler.test.ts
git commit -m "feat: add safe normalized MCP tool responses"
```

### Task 6: Add HTTP transport entrypoint for Azure

**Files:**
- Create: `src/http.ts`
- Create: `tests/integration/http-transport.test.ts`
- Modify: `src/index.ts`

**Step 1: Write the failing test**

Create transport test that boots HTTP server and verifies MCP endpoint responds to initialize handshake.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/http-transport.test.ts`
Expected: FAIL due to missing HTTP entrypoint.

**Step 3: Write minimal implementation**

- Add HTTP listener on `PORT` default `3000`.
- Expose `/healthz` endpoint returning 200.
- Mount MCP Streamable HTTP transport endpoint per SDK.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/integration/http-transport.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/http.ts src/index.ts tests/integration/http-transport.test.ts
git commit -m "feat: add streamable http transport for azure deployment"
```

### Task 7: Containerization and local smoke tooling

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `scripts/smoke-http.sh`
- Modify: `README.md`

**Step 1: Write the failing test**

Add a smoke check script expectation in CI/test docs:
- container builds
- `/healthz` returns 200

**Step 2: Run test to verify it fails**

Run: `docker build -t searchstax-mcp:dev .`
Expected: FAIL before Dockerfile exists.

**Step 3: Write minimal implementation**

- Multi-stage Dockerfile (`npm ci`, `npm run build`, runtime stage).
- `scripts/smoke-http.sh` to start container and curl `/healthz`.

**Step 4: Run test to verify it passes**

Run:
- `docker build -t searchstax-mcp:dev .`
- `bash scripts/smoke-http.sh`
Expected: build succeeds, health check passes.

**Step 5: Commit**

```bash
git add Dockerfile .dockerignore scripts/smoke-http.sh README.md
git commit -m "chore: add container packaging and smoke script"
```

### Task 8: Azure deployment assets

**Files:**
- Create: `deploy/azure/containerapp.bicep`
- Create: `deploy/azure/params.example.json`
- Create: `deploy/azure/deploy.sh`
- Create: `docs/azure-deployment.md`

**Step 1: Write the failing test**

Add validation step for infra template:
- `az bicep build` and `az deployment group validate` command documented and runnable.

**Step 2: Run test to verify it fails**

Run: `az bicep build --file deploy/azure/containerapp.bicep`
Expected: FAIL before template exists.

**Step 3: Write minimal implementation**

- Bicep for Log Analytics (optional), Container Apps Environment, Container App.
- Secret references for `SEARCHSTAX_API_TOKEN`.
- `deploy.sh` script with required env vars and commands.
- Docs for Key Vault secret creation and managed identity wiring.

**Step 4: Run test to verify it passes**

Run:
- `az bicep build --file deploy/azure/containerapp.bicep`
Expected: PASS.

**Step 5: Commit**

```bash
git add deploy/azure/containerapp.bicep deploy/azure/params.example.json deploy/azure/deploy.sh docs/azure-deployment.md
git commit -m "feat: add azure container apps deployment assets"
```

### Task 9: Codex CLI and mcp-proxy wiring docs

**Files:**
- Create: `docs/codex-cli-mcp-proxy.md`
- Modify: `README.md`

**Step 1: Write the failing test**

Doc checklist assertion:
- includes install command for `mcp-proxy`
- includes exact Codex CLI MCP config snippet
- includes local connectivity test command

**Step 2: Run test to verify it fails**

Run: Manual checklist review
Expected: missing instructions before doc exists.

**Step 3: Write minimal implementation**

- Add `mcp-proxy` install/use instructions.
- Provide exact config block for Codex CLI.
- Add end-to-end test prompt/command examples.

**Step 4: Run test to verify it passes**

Run: Manual checklist review
Expected: all checklist items present and clear.

**Step 5: Commit**

```bash
git add docs/codex-cli-mcp-proxy.md README.md
git commit -m "docs: add codex cli to azure mcp proxy setup guide"
```

### Task 10: Full verification gate

**Files:**
- Modify: `README.md` (verification section)

**Step 1: Write the failing test**

Create final verification checklist in README before running:
- all unit/integration tests
- build
- container smoke
- local MCP smoke

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: any remaining failures identified.

**Step 3: Write minimal implementation**

Fix only failing tests or missing docs/scripts discovered in Step 2.

**Step 4: Run test to verify it passes**

Run:
- `npm test`
- `npm run build`
- `docker build -t searchstax-mcp:dev .`
- `bash scripts/smoke-http.sh`
Expected: all PASS.

**Step 5: Commit**

```bash
git add README.md
git commit -m "chore: finalize verification checklist and green build"
```
