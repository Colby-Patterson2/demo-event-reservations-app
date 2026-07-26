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
$cosmosAccount = "cosmos-events-$EnvironmentName"

Write-Host "=== Post-provision hook for environment: $EnvironmentName ==="

# Seed Cosmos DB event inventory
Write-Host "[1/1] Seeding Cosmos DB inventory documents..."

$seedFile = Join-Path (Join-Path (Join-Path $PSScriptRoot '..') 'aca') 'cosmos-seed.json'
if (-not (Test-Path $seedFile)) {
    Write-Warning "Seed file not found at $seedFile. Skipping Cosmos seed."
    Write-Host "=== Post-provision hook finished (with warning) ==="
    exit 0
}

$endpoint = "https://$cosmosAccount.documents.azure.com:443/"

$cosmosKeyResult = az cosmosdb keys list `
    --name $cosmosAccount `
    --resource-group $rg `
    --query primaryMasterKey -o tsv 2>&1

$cosmosKey = if ($LASTEXITCODE -eq 0) { "$cosmosKeyResult".Trim() } else { $null }

if (-not $cosmosKey) {
    Write-Warning "Failed to retrieve Cosmos DB key. Skipping seed. Details: $cosmosKeyResult"
    Write-Host "=== Post-provision hook finished (with warning) ==="
    exit 0
}

$seedDocs = Get-Content $seedFile -Raw | ConvertFrom-Json

$keyBytes = [System.Convert]::FromBase64String($cosmosKey)
$hmac = New-Object System.Security.Cryptography.HMACSHA256

foreach ($doc in $seedDocs) {
    $utcNow = [DateTime]::UtcNow
    $date = $utcNow.ToString("r").ToLowerInvariant()

    $hmac.Key = $keyBytes
    $token = "post`ndocs`ndbs/reservations/colls/events`n$date`n`n"
    $sigBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($token))
    $sig = [System.Convert]::ToBase64String($sigBytes)
    $encodedSig = [Uri]::EscapeDataString($sig)

    $body = $doc | ConvertTo-Json -Depth 10 -Compress

    $headers = @{
        Authorization               = "type=master&ver=1.0&sig=$encodedSig"
        "x-ms-version"              = "2018-12-31"
        "x-ms-date"                 = $date
        "Content-Type"              = "application/json"
        "x-ms-documentdb-partitionkey" = "[`"$($doc.eventId)`"]"
    }

    $url = "${endpoint}dbs/reservations/colls/events/docs"

    try {
        $null = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
        Write-Host "      Seeded: $($doc.id)"
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 409) {
            Write-Host "      Already exists: $($doc.id)"
        } else {
            Write-Warning "      Failed to seed $($doc.id) (HTTP $statusCode): $($_.Exception.Message)"
        }
    }
}

Write-Host "      Cosmos DB seeding complete."
Write-Host "=== Post-provision hook finished ==="
