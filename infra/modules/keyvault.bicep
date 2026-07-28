param location string
param environmentName string
param functionIdentityPrincipalId string
param webIdentityPrincipalId string

@description('Principal ID of the deployment identity (user or SP running azd). Granted Key Vault Secrets Officer so the postdeploy hook can write secrets.')
param deploymentPrincipalId string = ''

var vaultName = take(toLower('kv-events-${environmentName}'), 24)

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: vaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
  }
}

var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'
var kvSecretsOfficerRoleId = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'
var kvSecretUserDef = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
var kvSecretOfficerDef = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsOfficerRoleId)

resource functionKvRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, functionIdentityPrincipalId, kvSecretsUserRoleId)
  scope: keyVault
  properties: {
    principalId: functionIdentityPrincipalId
    roleDefinitionId: kvSecretUserDef
    principalType: 'ServicePrincipal'
  }
}

resource webKvRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, webIdentityPrincipalId, kvSecretsUserRoleId)
  scope: keyVault
  properties: {
    principalId: webIdentityPrincipalId
    roleDefinitionId: kvSecretUserDef
    principalType: 'ServicePrincipal'
  }
}

resource deployKvRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(deploymentPrincipalId)) {
  name: guid(keyVault.id, deploymentPrincipalId, kvSecretsOfficerRoleId)
  scope: keyVault
  properties: {
    principalId: deploymentPrincipalId
    roleDefinitionId: kvSecretOfficerDef
    principalType: 'ServicePrincipal'
  }
}

output name string = keyVault.name
output uri string = keyVault.properties.vaultUri
