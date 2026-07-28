param location string
param environmentName string
param storageAccountName string
param cosmosEndpoint string
@secure()
param appInsightsConnectionString string
param functionIdentityResourceId string

var functionAppName = 'func-events-${environmentName}'
var safeEnv = take(replace(toLower(environmentName), '-', ''), 14)

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'

resource serverFarm 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'ASP-${functionAppName}'
  location: location
  kind: 'functionapp'
  properties: {
    reserved: true
  }
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
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
    reserved: true
    serverFarmId: serverFarm.id
    siteConfig: {
      linuxFxVersion: 'Node|22'
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
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '0'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: '1'
        }
        {
          name: 'ENABLE_ORYX_BUILD'
          value: 'true'
        }
        {
          name: 'AzureWebJobsStorage'
          value: storageConnectionString
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: storageConnectionString
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(functionAppName)
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
