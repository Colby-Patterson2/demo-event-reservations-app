import { CosmosClient, Container } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

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
  const databaseId = requiredEnv("COSMOS_DB_DATABASE_ID");
  const containerId = requiredEnv("COSMOS_DB_CONTAINER_ID");
  const useManagedIdentity =
    process.env.COSMOS_USE_MANAGED_IDENTITY?.toLowerCase() === "true";

  const client = useManagedIdentity
    ? new CosmosClient({
        endpoint,
        aadCredentials: new DefaultAzureCredential(),
      })
    : new CosmosClient({ endpoint, key: requiredEnv("COSMOS_DB_KEY") });
  cachedContainer = client.database(databaseId).container(containerId);

  return cachedContainer;
}