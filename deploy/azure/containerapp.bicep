param location string = resourceGroup().location
param containerAppName string
param containerAppsEnvironmentName string
param logAnalyticsName string
param acrServer string
param acrImage string
param managedIdentityResourceId string
param searchstaxBaseUrl string
@secure()
param gptActionApiKey string
param searchstaxApiTokenSecretRef string = 'searchstax-api-token'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerAppsEnvironmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: containerAppName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityResourceId}': {}
    }
  }
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
      }
      registries: [
        {
          server: acrServer
          identity: managedIdentityResourceId
        }
      ]
      secrets: [
        {
          name: searchstaxApiTokenSecretRef
          identity: managedIdentityResourceId
          keyVaultUrl: 'https://REPLACE_ME.vault.azure.net/secrets/SEARCHSTAX-API-TOKEN'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'searchstax-mcp'
          image: acrImage
          env: [
            {
              name: 'SEARCHSTAX_BASE_URL'
              value: searchstaxBaseUrl
            }
            {
              name: 'SEARCHSTAX_API_TOKEN'
              secretRef: searchstaxApiTokenSecretRef
            }
            {
              name: 'GPT_ACTION_API_KEY'
              value: gptActionApiKey
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}
