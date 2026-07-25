param location string
param environmentName string

resource functionIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  name: 'id-func-events-${environmentName}'
  location: location
}

resource webIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
  name: 'id-web-events-${environmentName}'
  location: location
}

output functionIdentityPrincipalId string = functionIdentity.properties.principalId
output functionIdentityResourceId string = functionIdentity.id
output functionIdentityClientId string = functionIdentity.properties.clientId
output webIdentityPrincipalId string = webIdentity.properties.principalId
output webIdentityResourceId string = webIdentity.id
output webIdentityClientId string = webIdentity.properties.clientId
