param(
    [string]$EnvironmentName = $env:AZURE_ENV_NAME
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

if (-not $EnvironmentName) {
    Write-Error "Environment name is required. Set AZURE_ENV_NAME or pass -EnvironmentName."
    exit 1
}

$rg            = "rg-events-$EnvironmentName"
$keyVault      = "kv-events-$EnvironmentName"
$functionApp   = "func-events-$EnvironmentName"

$safeName = $EnvironmentName.ToLowerInvariant() -replace '-', ''
$safeName = $safeName.Substring(0, [Math]::Min(14, $safeName.Length))
$cosmosAccount = "cosmos-events-$safeName"

Write-Host "=== Post-deploy hook for environment: $EnvironmentName ==="

# 1. Seed Cosmos DB event inventory
Write-Host "[1/3] Seeding Cosmos DB inventory..."
$cosmosEndpoint = "https://$cosmosAccount.documents.azure.com:443/"

$cosmosKeyResult = az cosmosdb keys list `
    --name $cosmosAccount `
    --resource-group $rg `
    --query primaryMasterKey -o tsv 2>&1

$cosmosKey = if ($LASTEXITCODE -eq 0) { "$cosmosKeyResult".Trim() } else { $null }

if (-not $cosmosKey) {
    Write-Warning "Failed to retrieve Cosmos DB key. Skipping seed. Details: $cosmosKeyResult"
} else {
    $seedDir = Join-Path (Join-Path (Join-Path $PSScriptRoot '..') 'aca') ''
    $seedScript = Join-Path $seedDir 'seed.mjs'

    Push-Location $seedDir
    try {
        npm install --silent @azure/cosmos 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "npm install @azure/cosmos failed. Skipping seed."
        } else {
            $seedResult = node seed.mjs $cosmosEndpoint $cosmosKey reservations events 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "Seed script failed: $seedResult"
            } else {
                Write-Host $seedResult
            }
        }
    } finally {
        Pop-Location
    }
}

# 2. Retrieve function key
Write-Host "[2/3] Retrieving host function key..."
$result = az functionapp keys list `
    --name $functionApp `
    --resource-group $rg `
    --query functionKeys.default -o tsv 2>&1

if ($LASTEXITCODE -eq 0 -and $result) {
    $key = "$result".Trim()
    Write-Host "      Host key retrieved."
} else {
    Write-Error "Failed to retrieve host function key. Details: $result"
    exit 1
}

# 3. Store in Key Vault
Write-Host "[3/3] Storing function key in Key Vault '$keyVault'..."
$setResult = az keyvault secret set `
    --vault-name $keyVault `
    --name "function-key" `
    --value $key `
    --output none 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Warning "Failed to store secret in Key Vault. Details: $setResult"
} else {
    Write-Host "      Secret 'function-key' stored."
}

Write-Host "=== Post-deploy hook finished ==="
