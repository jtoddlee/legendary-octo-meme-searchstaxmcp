#!/usr/bin/env bash
set -euo pipefail

: "${AZ_RESOURCE_GROUP:?Set AZ_RESOURCE_GROUP}"
: "${AZ_LOCATION:?Set AZ_LOCATION}"
: "${AZ_CONTAINERAPP_NAME:?Set AZ_CONTAINERAPP_NAME}"
: "${AZ_CONTAINERENV_NAME:?Set AZ_CONTAINERENV_NAME}"
: "${AZ_LOG_NAME:?Set AZ_LOG_NAME}"
: "${AZ_ACR_SERVER:?Set AZ_ACR_SERVER}"
: "${AZ_ACR_IMAGE:?Set AZ_ACR_IMAGE}"
: "${AZ_MANAGED_IDENTITY_ID:?Set AZ_MANAGED_IDENTITY_ID}"
: "${SEARCHSTAX_BASE_URL:?Set SEARCHSTAX_BASE_URL}"

echo "Validating bicep template"
az bicep build --file deploy/azure/containerapp.bicep >/dev/null

az deployment group create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --template-file deploy/azure/containerapp.bicep \
  --parameters \
    location="$AZ_LOCATION" \
    containerAppName="$AZ_CONTAINERAPP_NAME" \
    containerAppsEnvironmentName="$AZ_CONTAINERENV_NAME" \
    logAnalyticsName="$AZ_LOG_NAME" \
    acrServer="$AZ_ACR_SERVER" \
    acrImage="$AZ_ACR_IMAGE" \
    managedIdentityResourceId="$AZ_MANAGED_IDENTITY_ID" \
    searchstaxBaseUrl="$SEARCHSTAX_BASE_URL"
