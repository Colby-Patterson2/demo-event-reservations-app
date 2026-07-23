import { CosmosClient, Container } from "@azure/cosmos";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error("Missing required environment variable: " + name);
  }
  return value;
}

let cachedContainer: Container | null = null;

export function getReservationsContainer(): Container {
  if (cachedContainer) return cachedContainer;

  const endpoint = requiredEnv("COSMOS_DB_ENDPOINT");
  const key = requiredEnv("COSMOS_DB_KEY");
  const databaseId = requiredEnv("COSMOS_DB_DATABASE_ID");
  const containerId = requiredEnv("COSMOS_DB_CONTAINER_ID");

  const client = new CosmosClient({ endpoint, key });
  cachedContainer = client.database(databaseId).container(containerId);

  return cachedContainer;
}