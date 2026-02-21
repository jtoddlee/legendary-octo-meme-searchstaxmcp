# Azure Deployment Guide

## Prerequisites
- Azure CLI logged in (`az login`)
- Resource group created
- Azure Container Registry with pushed image
- User-assigned managed identity with:
  - `AcrPull` on registry
  - `Key Vault Secrets User` on vault storing `SEARCHSTAX-API-TOKEN`

## Deploy
1. Build and push image:
```bash
docker build -t <acr>/searchstax-mcp:latest .
docker push <acr>/searchstax-mcp:latest
```

2. Configure environment variables and run deployment:
```bash
export AZ_RESOURCE_GROUP="<rg>"
export AZ_LOCATION="eastus"
export AZ_CONTAINERAPP_NAME="searchstax-mcp"
export AZ_CONTAINERENV_NAME="searchstax-mcp-env"
export AZ_LOG_NAME="searchstax-mcp-logs"
export AZ_ACR_SERVER="<acr>.azurecr.io"
export AZ_ACR_IMAGE="<acr>.azurecr.io/searchstax-mcp:latest"
export AZ_MANAGED_IDENTITY_ID="/subscriptions/.../userAssignedIdentities/..."
export SEARCHSTAX_BASE_URL="https://<your-searchstax-endpoint>"
bash deploy/azure/deploy.sh
```

3. Configure the Key Vault URL in `deploy/azure/containerapp.bicep` secret block before deploy.

## Verify
```bash
az containerapp show -g <rg> -n searchstax-mcp --query properties.configuration.ingress.fqdn -o tsv
curl https://<fqdn>/healthz
```
