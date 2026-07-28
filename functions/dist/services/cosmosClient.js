"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReservationsContainer = getReservationsContainer;
const cosmos_1 = require("@azure/cosmos");
const identity_1 = require("@azure/identity");
function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
let cachedClient = null;
let cachedContainer = null;
function getReservationsContainer() {
    if (cachedContainer) {
        return cachedContainer;
    }
    const endpoint = requiredEnv("COSMOS_DB_ENDPOINT");
    const useManagedIdentity = process.env.COSMOS_USE_MANAGED_IDENTITY?.toLowerCase() === "true";
    if (!cachedClient) {
        cachedClient = useManagedIdentity
            ? new cosmos_1.CosmosClient({
                endpoint,
                aadCredentials: new identity_1.DefaultAzureCredential(),
            })
            : new cosmos_1.CosmosClient({
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
