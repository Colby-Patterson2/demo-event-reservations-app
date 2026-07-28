import { CosmosClient, type Container } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let cachedClient: CosmosClient | null = null;
let cachedContainer: Container | null = null;

export function getReservationsContainer(): Container {
  if (cachedContainer) {
    return cachedContainer;
  }

  const endpoint = requiredEnv("COSMOS_DB_ENDPOINT");
  const useManagedIdentity =
    process.env.COSMOS_USE_MANAGED_IDENTITY?.toLowerCase() === "true";

  if (!cachedClient) {
    cachedClient = useManagedIdentity
      ? new CosmosClient({
          endpoint,
          aadCredentials: new DefaultAzureCredential(),
        })
      : new CosmosClient({
          endpoint,
          key: requiredEnv("COSMOS_DB_KEY"),
        });
  }

  const databaseId = requiredEnv("COSMOS_DB_DATABASE_ID");
  const containerId = requiredEnv("COSMOS_DB_CONTAINER_ID");

  cachedContainer = cachedClient
    .database(databaseId)
    .container(containerId);

  return cachedContainer;
}
