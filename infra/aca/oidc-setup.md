# GitHub Actions OIDC (OpenID Connect) Setup

This setup enables passwordless authentication from GitHub Actions to Azure so the deploy workflow can run `azd provision` and `azd deploy` without storing a client secret in GitHub.

## Prerequisites

- Owner or Contributor + User Access Administrator on the target Azure subscription.
- GitHub repository admin access to configure secrets.
- Permission to register Microsoft Entra applications in the tenant (tenant-level app registration permission or Application Developer role). If you do not have this, ask an Entra admin to run steps 2-3.

## One-time setup

### 1. Collect required values

```powershell
# Your Azure subscription ID
$subId = az account show --query id -o tsv

# Your GitHub org / repo (e.g. my-org/events-app)
$ghRepo = "my-org/events-app"
```

### 2. Create the Entra ID application and service principal

```powershell
$appName = "gh-actions-events-app"

$appId = az ad app create `
    --display-name $appName `
    --query appId -o tsv

# Create the service principal
az ad sp create --id $appId --output none

Write-Host "Application (client) ID: $appId"
```

### 3. Add the federated credential for the main branch

```powershell
$subject = "repo:$($ghRepo):ref:refs/heads/main"

$mainCredential = @{
    name      = "gh-main-branch"
    issuer    = "https://token.actions.githubusercontent.com"
    subject   = $subject
    audiences = @("api://AzureADTokenExchange")
} | ConvertTo-Json -Depth 5

az ad app federated-credential create `
    --id $appId `
    --parameters $mainCredential
```

For PR validation workflows (optional):

```powershell
$prSubject = "repo:$($ghRepo):pull_request"

$prCredential = @{
    name      = "gh-pr-validation"
    issuer    = "https://token.actions.githubusercontent.com"
    subject   = $prSubject
    audiences = @("api://AzureADTokenExchange")
} | ConvertTo-Json -Depth 5

az ad app federated-credential create `
    --id $appId `
    --parameters $prCredential
```

### 4. Assign RBAC roles to the service principal

The principal needs **Contributor** on the subscription (to create resources) and **User Access Administrator** (to assign roles to managed identities in Bicep).

```powershell
$spObjectId = az ad sp show --id $appId --query id -o tsv

# Contributor on subscription
az role assignment create `
    --assignee $spObjectId `
    --role Contributor `
    --scope "/subscriptions/$subId"

# User Access Administrator on subscription (needed for managed identity role assignments)
az role assignment create `
    --assignee $spObjectId `
    --role "User Access Administrator" `
    --scope "/subscriptions/$subId"
```

### 5. Add GitHub repository secrets

In your GitHub repo: **Settings > Secrets and variables > Actions > New repository secret**

| Secret name | Value |
|---|---|
| `AZURE_CLIENT_ID` | The `appId` from step 2 |
| `AZURE_TENANT_ID` | `az account show --query tenantId -o tsv` |
| `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID |

## Verification

After setup, run the deploy workflow manually from the Actions tab and select the `refs/heads/main` branch. The `azure/login@v2` step should authenticate without errors because the federated credential subject is branch-specific.

If you need branch-agnostic manual runs, switch to an environment-scoped federated credential subject instead of a branch-scoped subject.

## Cleanup

```powershell
# Remove subscription role assignments first
az role assignment delete --assignee $spObjectId --role Contributor --scope "/subscriptions/$subId"
az role assignment delete --assignee $spObjectId --role "User Access Administrator" --scope "/subscriptions/$subId"

az ad app delete --id $appId
```

Remove the three secrets from GitHub repository settings.
