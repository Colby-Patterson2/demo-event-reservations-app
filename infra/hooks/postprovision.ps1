param(
    [string]$EnvironmentName = $env:AZURE_ENV_NAME
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

if (-not $EnvironmentName) {
    Write-Error "Environment name is required. Set AZURE_ENV_NAME or pass -EnvironmentName."
    exit 1
}

$safeName = $EnvironmentName.ToLowerInvariant() -replace '-', ''
$safeName = $safeName.Substring(0, [Math]::Min(14, $safeName.Length))

Write-Host "=== Post-provision hook for environment: $EnvironmentName ==="
Write-Host "      Resource group: rg-events-$safeName"
Write-Host "      The web container app image will be deployed by GitHub Actions."
Write-Host "      Cosmos DB seeding and Key Vault population handled by postdeploy hook."
Write-Host "=== Post-provision hook finished ==="
