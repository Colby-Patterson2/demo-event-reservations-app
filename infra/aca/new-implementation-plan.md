Deployment target architecture
Azure Container Registry for the web image.
Azure Container Apps for the Next.js web app.
Azure Functions (Node 20) for ReserveSeat API.
Azure Cosmos DB (SQL API) for reservations data.
Storage Account for Functions runtime.
Log Analytics + Application Insights for observability.
Key Vault for app secrets (function key and Cosmos details), with managed identity access only.
Security and identity model
Use user-assigned managed identities for runtime services.
No hardcoded secrets in code or repo.
Use workload identity/OIDC from GitHub Actions to Azure (no client secret in GitHub).
Assign minimal RBAC roles for deployment principal and runtime identities.
IaC and azd assets to add
Create azure.yaml at repo root for azd orchestration.
Create Bicep under infra/ for all resources and role assignments.
Add environment parameters for region/SKU and cost controls.
Include outputs for resource names and endpoints used by deployment steps.
GitHub Actions integration
Add workflow to:
Build/test web and functions.
Run azd provision preview.
Run azd up on main branch.
Add optional separate workflow for PR validation (build/lint only).
Document required GitHub secrets/variables and Azure federated credential setup.
Cost and production defaults I’ll encode
Container Apps with controlled min/max replicas.
Cosmos DB throughput tuned for MVP with parameterized RU.
App Insights sampling and logs retention.
Parameterized SKUs and regions for easy future optimization.
Validation and deployment steps
Validate Bicep and azd config.
Run quota checks for selected region before deployment.
Deploy with azd and verify logs/endpoints.