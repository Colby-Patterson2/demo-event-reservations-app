param(
    [string]$EnvironmentName = $env:AZURE_ENV_NAME
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

if (-not $EnvironmentName) {
    Write-Error "Environment name is required. Set AZURE_ENV_NAME or pass -EnvironmentName."
    exit 1
}

$containerApp  = "aca-events-web"
$rg            = "rg-events-$EnvironmentName"
$functionApp   = "func-events-$EnvironmentName"
$keyVault      = "kv-events-$EnvironmentName"

Write-Host "=== Post-deploy hook for environment: $EnvironmentName ==="

# ── 1. Retrieve function key ──
# At this point the function code has been published, so both host-level
# and function-scoped keys are available.
Write-Host "[1/3] Retrieving function key..."

$key = $null
$maxAttempts = 10

for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    $result = az functionapp keys list `
        --name $functionApp `
        --resource-group $rg `
        --query masterKey -o tsv 2>&1

    if ($LASTEXITCODE -eq 0 -and $result) {
        $key = "$result".Trim()
        Write-Host "      Host master key retrieved (attempt $attempt)."
        break
    }

    Write-Host "      Attempt $attempt/$maxAttempts : not ready yet, waiting 10s..."
    if ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 10
    }
}

if (-not $key) {
    Write-Warning "Failed to retrieve function key after $maxAttempts attempts."
    Write-Warning "You will need to set AZURE_FUNCTION_KEY manually on the Container App."
    Write-Host "      Run: az containerapp update -n $containerApp -g $rg --set-env-vars AZURE_FUNCTION_KEY=<key>"
    Write-Host "=== Post-deploy hook finished (with warning) ==="
    exit 0
}

# ── 2. Store in Key Vault ──
Write-Host "[2/3] Storing function key in Key Vault '$keyVault'..."
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

# ── 3. Update Container App with function key ──
Write-Host "[3/3] Updating Container App '$containerApp' with function key..."
$updateResult = az containerapp update `
    --name $containerApp `
    --resource-group $rg `
    --set-env-vars "AZURE_FUNCTION_KEY=$key" `
    --output none 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to update Container App. Details: $updateResult"
    exit 1
}

Write-Host "      Container App updated with function key."
Write-Host "=== Post-deploy hook finished ==="
