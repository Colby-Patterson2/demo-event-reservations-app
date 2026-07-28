// Seed Cosmos DB event inventory from cosmos-seed.json
// Usage: node seed.mjs <endpoint> <key> <databaseId> <containerId>
import { CosmosClient } from "@azure/cosmos";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const endpoint = process.argv[2];
const key = process.argv[3];
const databaseId = process.argv[4];
const containerId = process.argv[5];

if (!endpoint || !key || !databaseId || !containerId) {
  console.error(
    "Usage: node seed.mjs <endpoint> <key> <databaseId> <containerId>"
  );
  process.exit(1);
}

const client = new CosmosClient({ endpoint, key });
const container = client.database(databaseId).container(containerId);

const seedPath = join(__dirname, "cosmos-seed.json");
const docs = JSON.parse(readFileSync(seedPath, "utf-8"));

let errors = 0;

for (const doc of docs) {
  try {
    await container.items.create(doc);
    console.log(`      Seeded: ${doc.id}`);
  } catch (err) {
    if (err.code === 409) {
      console.log(`      Already exists: ${doc.id}`);
    } else {
      console.warn(`      Failed to seed ${doc.id}: ${err.message}`);
      errors++;
    }
  }
}

console.log("      Cosmos DB seeding complete.");
if (errors > 0) {
  console.error(`Seeding completed with ${errors} error(s).`);
  process.exit(1);
}
process.exit(0);
