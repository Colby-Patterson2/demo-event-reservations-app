param location string
param environmentName string
param storageAccountName string
param cosmosEndpoint string
@secure()
param appInsightsConnectionString string
param functionIdentityResourceId string

var functionAppName = 'func-events-${environmentName}'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

var storageAccountConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'

resource serverFarm 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'ASP-${functionAppName}'
  location: location
  kind: 'functionapp'
  properties: {}
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  tags: {
    'azd-service-name': 'function'
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${functionIdentityResourceId}': {}
    }
  }
  properties: {
    serverFarmId: serverFarm.id
    siteConfig: {
      windowsFxVersion: 'Node|22'
      appSettings: [
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'AzureWebJobsStorage'
          value: storageAccountConnectionString
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'COSMOS_DB_ENDPOINT'
          value: cosmosEndpoint
        }
        {
          name: 'COSMOS_DB_DATABASE_ID'
          value: 'reservations'
        }
        {
          name: 'COSMOS_DB_CONTAINER_ID'
          value: 'events'
        }
        {
          name: 'COSMOS_USE_MANAGED_IDENTITY'
          value: 'true'
        }
      ]
    }
    httpsOnly: true
  }
}

output functionAppName string = functionApp.name
output defaultHostName string = functionApp.properties.defaultHostName
