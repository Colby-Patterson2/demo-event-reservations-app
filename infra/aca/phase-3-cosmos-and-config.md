# Phase 3: Cosmos DB Setup and Function App Configuration

This guide covers provisioning Azure Cosmos DB, seeding the static event inventory, and configuring the Azure Function app with connection details and auth keys for the MVP deployment.

## Step 1: Provision Azure Cosmos DB

### Create a new Cosmos DB account (free tier for MVP)

```bash
# Using Azure CLI (if installed)
az cosmosdb create \
  --name <unique-account-name> \
  --resource-group <resource-group> \
  --locations regionName=<region> failoverPriority=0 \
  --enable-free-tier

# Or use Azure Portal:
# 1. Search "Azure Cosmos DB" in the portal.
# 2. Click "Create" > "Azure Cosmos DB for NoSQL".
# 3. Select "Free tier" if eligible.
# 4. Choose a unique account name and region.
# 5. Click "Create" and wait for provisioning (~2-3 min).
```

After creation, locate the keys:
- **Azure Portal**: Cosmos DB account > Settings > Keys.
- **CLI**: `az cosmosdb keys list --name <account-name> --resource-group <resource-group>`.

Copy the **Primary Connection String** or construct it from **URI** + **Primary Key**:
- `COSMOS_DB_ENDPOINT`: The URI endpoint (e.g., `https://my-account.documents.azure.com:443/`).
- `COSMOS_DB_KEY`: The primary key.

## Step 2: Create Database and Container

### Option A: Using Azure Portal

1. Open the Cosmos DB account.
2. Click **Data Explorer** > **New Container**.
3. **Database**: Create new, name it `reservations`.
4. **Container**: Name it `events`.
5. **Partition key**: `/eventId` (must match the lookup pattern in `functions/src/functions/ReserveSeat.ts`).
6. **Throughput**: Select **Autoscale** (recommended for MVP) or **Manual 400 RU/s** (minimum).
7. Click **OK** and wait for creation (~30 sec).

### Option B: Using Azure CLI

```bash
az cosmosdb sql database create \
  --account-name <account-name> \
  --resource-group <resource-group> \
  --name reservations

az cosmosdb sql container create \
  --account-name <account-name> \
  --resource-group <resource-group> \
  --database-name reservations \
  --name events \
  --partition-key-path /eventId \
  --throughput 400
```

## Step 3: Seed Event Inventory Documents

The reservation flow expects documents with the structure shown in `cosmos-seed.json`. Each event ID from the web catalog must have a corresponding inventory document.

### Seed documents locally (for testing)

Copy the three documents from [`cosmos-seed.json`](./cosmos-seed.json) into Cosmos using:

**Azure Portal:**
1. Open Data Explorer > `reservations` > `events`.
2. Click **New Item**.
3. Paste each JSON document (remove the array brackets).
4. Click **Save** after each.

**Azure CLI (bulk insert):**
```bash
# Install or upgrade to latest Cosmos CLI tools if needed.
# For now, use the portal or Azure Storage Explorer.
```

**Via Python / Node SDK (if setting up automation):**
```bash
# After provisioning, seed using the existing cosmosClient pattern.
# See functions/src/services/cosmosClient.ts for the client setup.
```

### Expected documents

After seeding, Data Explorer should show three items:
- `event-harbor-jazz-night` (partition key: `harbor-jazz-night`)
- `event-sunset-food-lab` (partition key: `sunset-food-lab`)
- `event-midnight-film-club` (partition key: `midnight-film-club`)

Verify by querying:
```sql
SELECT * FROM c WHERE c.type = "eventInventory"
```

Expected output: 3 rows, all with `availableSeats == totalSeats` initially.

## Step 4: Configure Azure Function App Settings

The Azure Function expects these environment variables to connect to Cosmos and run correctly.

### Fill in the values

Copy `env.sample` to a working copy and populate with real values from Step 1 and Step 2:

```bash
cp infra/aca/env.sample infra/aca/.env.local
# Edit .env.local and fill in real values:
# COSMOS_DB_ENDPOINT=https://my-account.documents.azure.com:443/
# COSMOS_DB_KEY=<primary-key>
# COSMOS_DB_DATABASE_ID=reservations
# COSMOS_DB_CONTAINER_ID=events
```

### Deploy function app settings to Azure

**Using Azure Portal:**
1. Open the Function App resource.
2. Settings > Configuration.
3. Click **+ New application setting** for each of the four Cosmos variables.
4. Set the names and values exactly as shown in `env.sample`.
5. Click **Save** and allow the function app to restart (~30 sec).

**Using Azure CLI:**
```bash
# If deployed via azd or manual ARM, update settings:
az functionapp config appsettings set \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --settings \
    COSMOS_DB_ENDPOINT="https://my-account.documents.azure.com:443/" \
    COSMOS_DB_KEY="<primary-key>" \
    COSMOS_DB_DATABASE_ID="reservations" \
    COSMOS_DB_CONTAINER_ID="events"
```

**Verify locally (for testing before deploy):**
1. Update `functions/local.settings.json` with the same values (the file is in `.gitignore`, so it won't be committed).
2. Run `npm start` in the `functions/` directory.
3. The function should connect to Cosmos without errors. Check the log output.

## Step 5: Azure Function Auth Decision

The `ReserveSeat` function is currently configured with `authLevel: "function"` in `functions/src/functions/ReserveSeat.ts`, which means:
- The endpoint is protected: only requests with the correct function key are accepted.
- The key must be passed in the `x-functions-key` header (see `web/app/events/[id]/actions.ts`).
- The key is never exposed to the browser; it's sent server-to-server by the Next.js server action.

**For MVP, keep this auth level.** It provides simple, zero-config API protection without requiring Entra ID or API Management.

### Get the function key

**Azure Portal:**
1. Open the Function App > Functions > ReserveSeat.
2. Click **Function Keys** (or **Manage** > **Function Keys**).
3. Copy the `default` key.
4. Save as `AZURE_FUNCTION_KEY` in `env.sample` and inject into the web app at deployment time.

**Azure CLI:**
```bash
az functionapp function keys list \
  --name <function-app-name> \
  --function-name ReserveSeat \
  --resource-group <resource-group>
```

### Alternative (not recommended for MVP)

If you later want to open the endpoint publicly without a key, change `authLevel: "anonymous"` in `functions/src/functions/ReserveSeat.ts` and redeploy. This is suitable only if you add rate limiting or other protections.

## Step 6: Test the End-to-End Flow

Once Cosmos is provisioned, seeded, and the function app settings are configured:

### Local test (before deployment)

```bash
# In functions/ directory, after updating local.settings.json:
npm start

# In another terminal, POST a reservation:
curl -X POST http://localhost:7071/api/reserve-seat \
  -H "Content-Type: application/json" \
  -H "x-functions-key: <local-test-key-if-needed>" \
  -d '{
    "eventId": "harbor-jazz-night",
    "fullName": "Test User",
    "email": "test@example.com",
    "seats": 2,
    "notes": "MVP test"
  }'

# Expected response (201 Created):
# {
#   "message": "Reservation created.",
#   "reservationId": "<uuid>",
#   "eventId": "harbor-jazz-night",
#   "seatsReserved": 2,
#   "remainingSeats": 46
# }
```

### Production test (after deployment)

1. Deploy the web app and function app (see Phase 5).
2. Open `https://<web-app-url>/events/harbor-jazz-night` in a browser.
3. Fill out the reservation form and submit.
4. Verify success message with reservation ID.
5. Check Cosmos Data Explorer: the inventory document for `harbor-jazz-night` should show `availableSeats: 46` (48 - 2).

## Decisions Summary

| Item | Decision | Rationale |
|------|----------|-----------|
| **Cosmos tier** | Free (if eligible) or Autoscale | Lowest cost for MVP. Autoscale adjusts RU/s to accommodate variable load and helps control throughput costs. |
| **Database name** | `reservations` | Clear intent. Keeps all event data together. |
| **Container name** | `events` | Short name for partition key hierarchy. |
| **Partition key** | `/eventId` | Matches `ReserveSeat.ts` lookup pattern. Ensures inventory reads/writes hit same logical partition. |
| **Seed strategy** | Static, manual, in-repo | Fastest for launch. No read API needed. Seed via portal for transparency. |
| **Function auth** | `authLevel: "function"` | Simple, requires function key in header. Prevents accidental public exposure. |
| **Function key** | Managed by Azure | Generated by Azure Portal. Injected into web app at deploy time via env vars. |

## Rollback / Cleanup

If you need to reset Cosmos for a re-seed:

```bash
# Delete the container and recreate it (data lost).
az cosmosdb sql container delete \
  --account-name <account-name> \
  --database-name reservations \
  --name events \
  --resource-group <resource-group> \
  --yes

# Then recreate and re-seed (see steps 2 and 3 above).
```

To delete the entire Cosmos account (careful!):
```bash
az cosmosdb delete \
  --name <account-name> \
  --resource-group <resource-group> \
  --yes
```
