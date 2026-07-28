targetScope = 'subscription'

@minLength(1)
@maxLength(14)
@description('Suffix applied to all resource names. Use lowercase alphanumeric values only.')
param environmentName string = 'mvp'

@minLength(1)
@description('Azure region for all resources.')
param location string = 'westus3'

@minValue(400)
@maxValue(100000)
@description('Throughput (RU/s) for the Cosmos DB events container.')
param cosmosThroughput int = 400

@description('Enable Cosmos DB free tier. Only one free-tier account allowed per subscription.')
param cosmosEnableFreeTier bool = true

@minValue(0)
@maxValue(10)
@description('Minimum container replicas. 0 = scale to zero when idle.')
param containerAppMinReplicas int = 0

@minValue(0)
@maxValue(30)
@description('Maximum container replicas.')
param containerAppMaxReplicas int = 3

@description('ACR SKU.')
@allowed(['Basic', 'Standard', 'Premium'])
param acrSku string = 'Basic'

@minValue(30)
@maxValue(730)
@description('Log Analytics workspace retention in days.')
param appInsightsRetentionDays int = 30

@description('Principal ID of the identity running azd (user or SP). Granted Key Vault Secrets Officer for postdeploy hook.')
param deploymentPrincipalId string = ''

var tags = {
  environment: environmentName
  app: 'events-app'
}

var safeEnvironmentName = take(replace(toLower(environmentName), '-', ''), 14)
var resourceGroupName = 'rg-events-${safeEnvironmentName}'

resource resourceGroup 'Microsoft.Resources/resourceGroups@2024-11-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module identity 'modules/identity.bicep' = {
  name: 'identity-deploy'
  scope: resourceGroup
  params: {
    location: location
    environmentName: safeEnvironmentName
  }
}

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring-deploy'
  scope: resourceGroup
  params: {
    location: location
    environmentName: safeEnvironmentName
    retentionDays: appInsightsRetentionDays
  }
}

module storageModule 'modules/storage.bicep' = {
  name: 'storage-deploy'
  scope: resourceGroup
  params: {
    location: location
    environmentName: safeEnvironmentName
  }
}

module cosmos 'modules/cosmos.bicep' = {
  name: 'cosmos-deploy'
  scope: resourceGroup
  params: {
    location: location
    environmentName: safeEnvironmentName
    throughput: cosmosThroughput
    enableFreeTier: cosmosEnableFreeTier
    functionIdentityPrincipalId: identity.outputs.functionIdentityPrincipalId
  }
}

module keyvault 'modules/keyvault.bicep' = {
  name: 'keyvault-deploy'
  scope: resourceGroup
  params: {
    location: location
    environmentName: safeEnvironmentName
    functionIdentityPrincipalId: identity.outputs.functionIdentityPrincipalId
    webIdentityPrincipalId: identity.outputs.webIdentityPrincipalId
    deploymentPrincipalId: deploymentPrincipalId
  }
}

module acr 'modules/acr.bicep' = {
  name: 'acr-deploy'
  scope: resourceGroup
  params: {
    location: location
    environmentName: safeEnvironmentName
    sku: acrSku
    webIdentityPrincipalId: identity.outputs.webIdentityPrincipalId
  }
}

module functionsModule 'modules/functions.bicep' = {
  name: 'functions-deploy'
  scope: resourceGroup
  params: {
    location: location
    environmentName: safeEnvironmentName
    storageAccountName: storageModule.outputs.name
    cosmosEndpoint: cosmos.outputs.endpoint
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    functionIdentityResourceId: identity.outputs.functionIdentityResourceId
  }
}

module containerApps 'modules/containerapps.bicep' = {
  name: 'containerapps-deploy'
  scope: resourceGroup
  params: {
    location: location
    environmentName: safeEnvironmentName
    acrLoginServer: acr.outputs.loginServer
    functionAppName: functionsModule.outputs.functionAppName
    webIdentityResourceId: identity.outputs.webIdentityResourceId
    logAnalyticsWorkspaceName: monitoring.outputs.workspaceName
    minReplicas: containerAppMinReplicas
    maxReplicas: containerAppMaxReplicas
  }
}

output AZURE_RESOURCE_GROUP string = resourceGroup.name
output AZURE_LOCATION string = resourceGroup.location
output acrLoginServer string = acr.outputs.loginServer
output functionAppName string = functionsModule.outputs.functionAppName
output containerAppFqdn string = containerApps.outputs.fqdn
output keyVaultName string = keyvault.outputs.name
output cosmosEndpoint string = cosmos.outputs.endpoint
