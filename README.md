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

## Windows PowerShell Only: Azure Deployment

This section is intentionally **Windows PowerShell only**. Do not mix with bash syntax.

### 1) Set PowerShell environment variables
```powershell
$env:AZ_LOCATION="westus2"
$env:AZ_RESOURCE_GROUP="rg-searchstax-mcp"
$env:AZ_CONTAINERAPP_NAME="searchstax-mcp"
$env:AZ_CONTAINERENV_NAME="searchstax-mcp-env"
$env:AZ_LOG_NAME="searchstax-mcp-logs"
$env:AZ_ACR_NAME="searchstaxmcpacrone" # must be globally unique, lowercase
$env:AZ_ACR_SERVER="$($env:AZ_ACR_NAME).azurecr.io"
$env:AZ_ACR_IMAGE="$($env:AZ_ACR_SERVER)/searchstax-mcp:latest"
$env:AZ_IDENTITY_NAME="id-searchstax-mcp"
$env:AZ_KEYVAULT_NAME="kv-searchstax-mcp-one" # must be globally unique
$env:SEARCHSTAX_BASE_URL="https://<your-searchstax-endpoint>"
```

### 2) Create Azure resources
```powershell
az login
az account set --subscription "<SUBSCRIPTION_ID_OR_NAME>"

az group create -n $env:AZ_RESOURCE_GROUP -l $env:AZ_LOCATION
az acr create -g $env:AZ_RESOURCE_GROUP -n $env:AZ_ACR_NAME --sku Basic
az identity create -g $env:AZ_RESOURCE_GROUP -n $env:AZ_IDENTITY_NAME
az keyvault create -g $env:AZ_RESOURCE_GROUP -n $env:AZ_KEYVAULT_NAME -l $env:AZ_LOCATION
```

### 3) Store SearchStax token in Key Vault
```powershell
az keyvault secret set `
  --vault-name $env:AZ_KEYVAULT_NAME `
  --name "SEARCHSTAX-API-TOKEN" `
  --value "<YOUR_SEARCHSTAX_API_TOKEN>"
```

### 4) Grant permissions to managed identity
```powershell
$env:AZ_MANAGED_IDENTITY_ID = az identity show -g $env:AZ_RESOURCE_GROUP -n $env:AZ_IDENTITY_NAME --query id -o tsv
$IDENTITY_PRINCIPAL_ID = az identity show -g $env:AZ_RESOURCE_GROUP -n $env:AZ_IDENTITY_NAME --query principalId -o tsv
$ACR_ID = az acr show -g $env:AZ_RESOURCE_GROUP -n $env:AZ_ACR_NAME --query id -o tsv
$KV_ID = az keyvault show -g $env:AZ_RESOURCE_GROUP -n $env:AZ_KEYVAULT_NAME --query id -o tsv

az role assignment create --assignee-object-id $IDENTITY_PRINCIPAL_ID --assignee-principal-type ServicePrincipal --role AcrPull --scope $ACR_ID
az role assignment create --assignee-object-id $IDENTITY_PRINCIPAL_ID --assignee-principal-type ServicePrincipal --role "Key Vault Secrets User" --scope $KV_ID
```

If Key Vault is in access policy mode (`enableRbacAuthorization: false`), also run:
```powershell
az keyvault set-policy `
  --name $env:AZ_KEYVAULT_NAME `
  --object-id $IDENTITY_PRINCIPAL_ID `
  --secret-permissions get list
```

### 5) Build and push container image
```powershell
cd C:\path\to\legendary-octo-meme-searchstaxmcp

# Option A: local Docker
az acr login -n $env:AZ_ACR_NAME
docker build -t $env:AZ_ACR_IMAGE .
docker push $env:AZ_ACR_IMAGE

# Option B: build in Azure (no local Docker required)
az acr build -r $env:AZ_ACR_NAME -t searchstax-mcp:latest .
$env:AZ_ACR_IMAGE="$($env:AZ_ACR_SERVER)/searchstax-mcp:latest"
```

### 6) Update Key Vault URL in Bicep
In `deploy/azure/containerapp.bicep`, replace:
```text
https://REPLACE_ME.vault.azure.net/secrets/SEARCHSTAX-API-TOKEN
```
with:
```text
https://<your-keyvault-name>.vault.azure.net/secrets/SEARCHSTAX-API-TOKEN
```

### 7) Deploy Container App
```powershell
az deployment group create `
  --resource-group $env:AZ_RESOURCE_GROUP `
  --template-file deploy/azure/containerapp.bicep `
  --parameters `
    location=$env:AZ_LOCATION `
    containerAppName=$env:AZ_CONTAINERAPP_NAME `
    containerAppsEnvironmentName=$env:AZ_CONTAINERENV_NAME `
    logAnalyticsName=$env:AZ_LOG_NAME `
    acrServer=$env:AZ_ACR_SERVER `
    acrImage=$env:AZ_ACR_IMAGE `
    managedIdentityResourceId=$env:AZ_MANAGED_IDENTITY_ID `
    searchstaxBaseUrl=$env:SEARCHSTAX_BASE_URL
```

### 8) Verify deployment
```powershell
$fqdn = az containerapp show -g $env:AZ_RESOURCE_GROUP -n $env:AZ_CONTAINERAPP_NAME --query properties.configuration.ingress.fqdn -o tsv
$fqdn
curl "https://$fqdn/healthz"
```

### 9) Wire Codex CLI to remote MCP
```powershell
codex mcp add searchstax --url "https://$fqdn/mcp"
codex mcp list
```

## Windows PowerShell Troubleshooting

- `argument --name ... expected one argument`
  - Cause: used bash-style variable references.
  - Fix: use PowerShell variables, e.g. `-n $env:AZ_RESOURCE_GROUP`.

- `ContainerAppInvalidRegistryServerValue` with `.azurecr.io`
  - Cause: `$env:AZ_ACR_SERVER` was empty.
  - Fix:
    ```powershell
    $env:AZ_ACR_SERVER="$($env:AZ_ACR_NAME).azurecr.io"
    $env:AZ_ACR_IMAGE="$($env:AZ_ACR_SERVER)/searchstax-mcp:latest"
    ```

- `DOCKER_COMMAND_ERROR` during `az acr login`
  - Cause: Docker Desktop not installed/running.
  - Fix: start Docker Desktop or use `az acr build` instead of local Docker.

- `Unable to get value using Managed identity ... for secret`
  - Cause: Key Vault is in access policy mode and identity lacks secret get permission there.
  - Fix: run `az keyvault set-policy --secret-permissions get list` for the managed identity principal ID.

- `az deployment group create` appears stuck at `Running...`
  - This can take several minutes when creating Container Apps environment and dependencies.
  - Wait unless it is stalled for an unusually long time.

## Docs
- Azure deploy: `docs/azure-deployment.md`
- Codex CLI proxy wiring: `docs/codex-cli-mcp-proxy.md`
- Design: `docs/plans/2026-02-21-searchstax-mcp-design.md`
- Implementation plan: `docs/plans/2026-02-21-searchstax-mcp-implementation.md`
