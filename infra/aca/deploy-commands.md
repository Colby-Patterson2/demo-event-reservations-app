# MVP Deploy Commands (Container Apps + Azure Functions + Cosmos DB)

This runbook provides a repeatable CLI path for Phase 5 deployment. Replace placeholder values before running.

## 1) Set common variables

```bash
RG="rg-events-mvp"
LOC="eastus"

COSMOS_ACCOUNT="cosmos-events-mvp"
COSMOS_DB="reservations"
COSMOS_CONTAINER="events"

FUNCTION_APP="func-events-mvp"
STORAGE_ACCOUNT="steventsmvp001"
APPINSIGHTS_NAME="appi-events-mvp"

ACA_ENV="acae-events-mvp"
ACA_APP="aca-events-web"

ACR_NAME="acreventsmvp"
IMAGE_NAME="events-web"
IMAGE_TAG="v1"
```

## 2) Create resource group

```bash
az group create --name "$RG" --location "$LOC"
```

## 3) Provision Cosmos DB and container

```bash
az cosmosdb create \
	--name "$COSMOS_ACCOUNT" \
	--resource-group "$RG" \
	--locations regionName="$LOC" failoverPriority=0 \
	--enable-free-tier

az cosmosdb sql database create \
	--account-name "$COSMOS_ACCOUNT" \
	--resource-group "$RG" \
	--name "$COSMOS_DB"

az cosmosdb sql container create \
	--account-name "$COSMOS_ACCOUNT" \
	--resource-group "$RG" \
	--database-name "$COSMOS_DB" \
	--name "$COSMOS_CONTAINER" \
	--partition-key-path "/eventId" \
	--throughput 400
```

Get endpoint/key:

```bash
COSMOS_ENDPOINT=$(az cosmosdb show --name "$COSMOS_ACCOUNT" --resource-group "$RG" --query documentEndpoint -o tsv)
COSMOS_KEY=$(az cosmosdb keys list --name "$COSMOS_ACCOUNT" --resource-group "$RG" --query primaryMasterKey -o tsv)
```

Seed data:
- Use `infra/aca/cosmos-seed.json` and insert the three `eventInventory` docs via Cosmos Data Explorer.

## 4) Provision Function App and publish

```bash
az storage account create \
	--name "$STORAGE_ACCOUNT" \
	--resource-group "$RG" \
	--location "$LOC" \
	--sku Standard_LRS

az monitor app-insights component create \
	--app "$APPINSIGHTS_NAME" \
	--location "$LOC" \
	--resource-group "$RG" \
	--application-type web

az functionapp create \
	--name "$FUNCTION_APP" \
	--resource-group "$RG" \
	--storage-account "$STORAGE_ACCOUNT" \
	--consumption-plan-location "$LOC" \
	--runtime node \
	--runtime-version 20 \
	--functions-version 4

az functionapp config appsettings set \
	--name "$FUNCTION_APP" \
	--resource-group "$RG" \
	--settings \
		COSMOS_DB_ENDPOINT="$COSMOS_ENDPOINT" \
		COSMOS_DB_KEY="$COSMOS_KEY" \
		COSMOS_DB_DATABASE_ID="$COSMOS_DB" \
		COSMOS_DB_CONTAINER_ID="$COSMOS_CONTAINER"
```

Publish function from repo:

```bash
cd functions
npm ci
npm run build
func azure functionapp publish "$FUNCTION_APP"
cd ..
```

Get function endpoint + key:

```bash
FUNCTION_URL="https://${FUNCTION_APP}.azurewebsites.net/api/reserve-seat"
FUNCTION_KEY=$(az functionapp function keys list \
	--name "$FUNCTION_APP" \
	--resource-group "$RG" \
	--function-name ReserveSeat \
	--query default -o tsv)
```

## 5) Build and push web image to ACR

```bash
az acr create \
	--name "$ACR_NAME" \
	--resource-group "$RG" \
	--sku Basic

ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --resource-group "$RG" --query loginServer -o tsv)

az acr login --name "$ACR_NAME"

docker build -t "$ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG" ./web
docker push "$ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG"
```

## 6) Deploy web to Azure Container Apps

```bash
az containerapp env create \
	--name "$ACA_ENV" \
	--resource-group "$RG" \
	--location "$LOC"

az containerapp create \
	--name "$ACA_APP" \
	--resource-group "$RG" \
	--environment "$ACA_ENV" \
	--image "$ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG" \
	--target-port 3000 \
	--ingress external \
	--registry-server "$ACR_LOGIN_SERVER" \
	--env-vars \
		AZURE_FUNCTION_RESERVE_URL="$FUNCTION_URL" \
		AZURE_FUNCTION_KEY="$FUNCTION_KEY"
```

Get web URL:

```bash
WEB_URL=$(az containerapp show --name "$ACA_APP" --resource-group "$RG" --query properties.configuration.ingress.fqdn -o tsv)
echo "https://$WEB_URL"
```

## 7) Smoke tests

Function direct test:

```bash
curl -X POST "$FUNCTION_URL" \
	-H "Content-Type: application/json" \
	-H "x-functions-key: $FUNCTION_KEY" \
	-d '{
		"eventId": "harbor-jazz-night",
		"fullName": "MVP Smoke Test",
		"email": "smoke@example.com",
		"seats": 1,
		"notes": "phase-5 smoke"
	}'
```

Web flow test:

```bash
echo "Open: https://$WEB_URL/events/harbor-jazz-night"
```

Expected:
- Function returns HTTP 201 with `reservationId`.
- Web form shows success message.
- Cosmos `eventInventory` for `harbor-jazz-night` decrements `availableSeats` by 1.
