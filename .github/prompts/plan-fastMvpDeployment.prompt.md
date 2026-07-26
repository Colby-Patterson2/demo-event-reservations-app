## Plan: Fast MVP Deployment

Ship the smallest end-to-end reservation flow by reusing the existing `reserveSeatAction` and `reserveSeat` backend, avoiding new backend read APIs for now. The fastest path is: hardcode a tiny event catalog in the web app, manually seed matching `eventInventory` documents in Cosmos DB, deploy the Azure Function, deploy the Next.js container, and verify one reservation succeeds in production.

**Steps**
1. Phase 1: Lock MVP scope and deployment shape.
2. Define MVP scope as one public landing page, one event detail page, one reservation form, one reservation POST endpoint, and Cosmos-backed seat inventory. Exclude admin tooling, auth for end users, payment, emails, analytics dashboards, CI/CD, and full IaC from the first deploy.
3. Keep the current architecture: Next.js web in `web/` calling the Azure Function from `web/app/events/[id]/actions.ts`, with Cosmos access remaining isolated to `functions/src/functions/ReserveSeat.ts` and `functions/src/services/cosmosClient.ts`.
4. Phase 2: Complete the minimum web vertical slice. Depends on Phase 1.
5. Replace the starter content in `c:\Users\bella\Downloads\events-app\web\app\page.tsx` with a simple event list that links to `/events/[id]`.
6. Implement `c:\Users\bella\Downloads\events-app\web\app\events\[id]\page.tsx` to render one event’s details, availability messaging, and the reservation form.
7. Implement `c:\Users\bella\Downloads\events-app\web\components\ReservationForm.tsx` using the existing `reserveSeatAction` in `web/app/events/[id]/actions.ts` for submission, error display, pending state, and success messaging.
8. Fill `c:\Users\bella\Downloads\events-app\web\lib\types.ts` with the minimum shared event/reservation response types needed by the pages and form.
9. Fill `c:\Users\bella\Downloads\events-app\web\lib\api.ts` with the smallest possible data source abstraction. For speed, prefer a static in-repo event catalog plus lookup helpers instead of building new backend read endpoints. This step is parallel with step 8.
10. Phase 3: Prepare production data and backend configuration. Depends on Phase 1 and can begin in parallel with Phase 2.
11. Provision Azure Cosmos DB with one database and one container whose partition key matches the existing function’s lookup/write pattern around `eventId` in `functions/src/functions/ReserveSeat.ts`.
12. Manually seed 2-3 `eventInventory` documents matching the static event IDs used by the web app, with `id` values following `event-{eventId}` as defined by `inventoryDocId()` in `functions/src/functions/ReserveSeat.ts`.
13. Configure the Azure Function app settings for `COSMOS_DB_ENDPOINT`, `COSMOS_DB_KEY`, `COSMOS_DB_DATABASE_ID`, and `COSMOS_DB_CONTAINER_ID`, matching the requirements in `functions/src/services/cosmosClient.ts`.
14. Decide whether to keep function auth at `authLevel: "function"` for MVP. Recommended: keep it and pass `AZURE_FUNCTION_KEY` from the web app environment to avoid opening the endpoint publicly.
15. Clean up the TypeScript config warning in `c:\Users\bella\Downloads\events-app\functions\tsconfig.json` so the backend is on a non-deprecated path before deployment.
16. Phase 4: Make builds reproducible. Depends on Phases 2 and 3.
17. Install dependencies in `c:\Users\bella\Downloads\events-app\web`, generate and commit a real `package-lock.json`, then verify `npm run build` succeeds for the web app.
18. Re-run `npm run build` for `c:\Users\bella\Downloads\events-app\functions` to confirm the function still compiles after any config cleanup.
19. Add concrete environment templates to `c:\Users\bella\Downloads\events-app\infra\aca\env.sample` for both the web app and function app so deployment is repeatable.
20. Write the actual deployment runbook in `c:\Users\bella\Downloads\events-app\infra\aca\deploy-commands.md`, covering resource creation, app settings, image build/push, function publish, and smoke-test commands.
21. Phase 5: Deploy and verify. Depends on Phase 4.
22. Deploy the Azure Function first, because the web app already depends on `AZURE_FUNCTION_RESERVE_URL` and `AZURE_FUNCTION_KEY` in `web/app/events/[id]/actions.ts`.
23. Deploy the Next.js app using the existing standalone container setup in `c:\Users\bella\Downloads\events-app\web\Dockerfile`, injecting `AZURE_FUNCTION_RESERVE_URL` and `AZURE_FUNCTION_KEY` into the runtime environment.
24. Run one end-to-end reservation smoke test against production or a staging-equivalent environment: load the event page, submit a reservation, confirm a 201 response path, and verify the `availableSeats` decrement in Cosmos.
25. If time remains after the first successful deploy, add one adjacent hardening pass: user-friendly empty/error states, duplicate submission protection, and a simple reservation confirmation summary. This is parallel with documentation polish once the smoke test passes.

**Relevant files**
- `c:\Users\bella\Downloads\events-app\web\app\page.tsx` — replace starter UI with MVP event list.
- `c:\Users\bella\Downloads\events-app\web\app\events\[id]\page.tsx` — implement event detail page and form integration.
- `c:\Users\bella\Downloads\events-app\web\app\events\[id]\actions.ts` — reuse existing server action and env contract.
- `c:\Users\bella\Downloads\events-app\web\components\ReservationForm.tsx` — implement the form UI and action state handling.
- `c:\Users\bella\Downloads\events-app\web\lib\api.ts` — add minimal event catalog/read helpers.
- `c:\Users\bella\Downloads\events-app\web\lib\types.ts` — add shared frontend types.
- `c:\Users\bella\Downloads\events-app\web\Dockerfile` — reuse existing standalone Next.js container build.
- `c:\Users\bella\Downloads\events-app\functions\src\functions\ReserveSeat.ts` — existing reservation endpoint and inventory ID convention to preserve.
- `c:\Users\bella\Downloads\events-app\functions\src\services\cosmosClient.ts` — required backend env vars and Cosmos wiring.
- `c:\Users\bella\Downloads\events-app\functions\src\models\reservation.ts` — backend data model reference for seeded docs and frontend types.
- `c:\Users\bella\Downloads\events-app\functions\local.settings.json` — local mirror of function app settings for development.
- `c:\Users\bella\Downloads\events-app\functions\tsconfig.json` — clear the deprecation warning before deploy.
- `c:\Users\bella\Downloads\events-app\infra\aca\env.sample` — fill with concrete required env vars.
- `c:\Users\bella\Downloads\events-app\infra\aca\deploy-commands.md` — write the deploy runbook.

**Verification**
1. In `web/`, run `npm install` then `npm run build` to confirm the Next.js app is production-buildable.
2. In `functions/`, run `npm run build` and `npm start` with real or emulator-backed settings to validate the function locally.
3. Submit a local or deployed POST request to the reservation endpoint with a seeded `eventId` and verify success plus the expected 400, 404, and 409 error paths.
4. From the web UI, reserve seats for a seeded event and verify success messaging, cache refresh behavior, and updated inventory in Cosmos.
5. Build the web container from `web/Dockerfile` and confirm the container starts with the required runtime env vars.
6. After deployment, run a smoke test covering page load, reservation submission, and Cosmos inventory decrement.

**Decisions**
- Fastest path: do not add a new backend event listing API for the first MVP; use a static event catalog in the web app and keep Cosmos only for inventory/reservations.
- Keep the existing Azure Functions v4 code-first model; no `function.json` work is required.
- Keep function-key auth for MVP unless there is a strong reason to expose the function publicly.
- Manual Azure provisioning and manual Cosmos seeding are included for MVP speed; CI/CD and full IaC are explicitly excluded from the first deploy.

**Further Considerations**
1. Event source strategy recommendation: Option A static event catalog plus manual Cosmos seed is the fastest; Option B add a read API only if the event list must be managed outside the repo before launch.
2. Hosting strategy recommendation: Option A deploy web to Azure Container Apps to match the existing Dockerfile; Option B move web to Vercel only if you want simpler Next hosting and are comfortable managing cross-service env/auth separately.
3. Post-MVP hardening: add event read APIs, admin seeding tooling, monitoring, and deployment automation only after the first successful reservation flow is live.