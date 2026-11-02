# Google SSO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace owner-password auth with private Google sign-in and maintained ChatGPT OAuth on the current domain.
**Architecture:** Better Auth and its MCP provider run on the existing Node worker with a separate SQLite auth database. React shares the owner login with the provider's signed consent transaction; Vercel forwards only permitted routes and protocol headers.
**Tech Stack:** Node 24+, TypeScript, React/esbuild, node:sqlite, Better Auth 1.7.15, @better-auth/mcp and @better-auth/oauth-provider 1.7.15.
**Spec:** ../specs/2026-11-02-google-sso-design.md (approved by Wilson).

## Global Constraints
- Single owner: detorres.wilson21@gmail.com, explicitly confirmed in this chat; pin verified Google subject at bootstrap.
- Current public origin: https://brain-companion-hazel.vercel.app. No domain or DNS changes.
- No password fallback, public signup, Obsidian login wizard, sync scheduling or vault policy changes.
- Preserve the existing brain scope. Legacy password sessions and MCP tokens must not authorize the new app.
- Opaque MCP tokens and library validation provide immediate database-backed revocation. Use the explicitly supported DCR flow initially, matching the existing ChatGPT setup.

## Review Focus
- Wrong Google account using the approved email string without a verified Google identity must never bootstrap ownership (Task 1).
- Sign-in/consent queries changed by the browser must not change the registered callback or grant (Task 2).
- Revoked access and refresh tokens must stay invalid after reconnection (Task 2).
- Removing the password environment variable must not put production into demo mode or reset Sync (Task 1/4).
- Canonical URL and HTTP body/header forwarding must work through Vercel, including modern MCP headers and JSON bodies (Task 3/4).

### Task 1: Owner identity, sessions and runtime
**Files:** server/auth.ts, server/config.ts, server/main.ts, tests/auth.test.ts, tests/config.test.ts, package.json and lockfile.
**Interfaces:** createAuthService(db: DatabaseSync, config: AuthConfig) -> Promise<AuthService>; service.handle(Request) -> Promise<Response|undefined>, session(Request) -> Promise<owner session|null>, csrf(Request, unknown) -> boolean, bearer(string|null) -> Promise<grant|null>. AuthConfig includes origin, secret, ownerEmail and Google client credentials.
- [x] Write and run failing tests for the confirmed-account bootstrap/pin, wrong/unverified account rejection, canonical origin configuration, and removal of password startup gating.
- [x] Configure Better Auth Google provider with owner admission, supported migrations, durable auth storage, no credential/password endpoints and no session cookie caching.
- [x] Run focused auth/config tests; run npm run check. Expected: pass, no type errors.

### Task 2: Maintained MCP OAuth and consent
**Files:** server/auth.ts, server/http.ts, tests/auth.test.ts, tests/http.test.ts.
**Interfaces:** service.bearer validates through the provider; grant includes clientId/name/userId/scope; owner-only app list/revoke and consent-detail API return bounded public fields.
- [x] Write a failing complete local OAuth flow test using a synthetic owner session: discovery, DCR, authorize, signed consent, PKCE token exchange, MCP call, refresh, revoke and replay rejection.
- [x] Replace custom OAuth with mcp() provider using explicit DCR, opaque tokens, brain/offline_access scopes and exact resource. Use server-only library validation; validate owner, audience and scope at MCP boundary. Implement owner-managed revocation of access, refresh and consent records.
- [x] Preserve existing API CSRF checks and bridge key boundary; remove temporary diagnostics and legacy password/OAuth handlers.
- [x] Run auth/http tests. Expected: pass, anonymous and revoked calls denied; metadata derives from configuration.

### Task 3: Login, consent, connected apps and Sync UI
**Files:** src/auth-client.ts, src/Auth.tsx, src/App.tsx, src/styles.css, tests/auth-ui.test.ts, api/bridge.ts, vercel.json, tests/bridge.test.ts.
**Interfaces:** auth client uses oauthProviderClient() to preserve signed oauth_query; login and consent components use library endpoints. Existing authenticated snapshot remains the source for Sync status.
- [x] Write failing behavior tests for the limited app route surface and MCP header/body preservation; test any owned UI transaction/return-url logic, not library mechanics.
- [x] Add Google login, signed consent with explicit Connect/Cancel and pending/error states, account/signout and connected-app revocation. Use existing app styling and responsive layout.
- [x] Expose evidence-based Sync status only. Add required same-origin page rewrites and narrow auth bridge routes.
- [x] Run UI/bridge tests, typecheck, build and a browser flow against synthetic data. Expected: accessible login and actionable consent, no secrets exposed.

### Task 4: Operations, review and deployment
**Files:** .env.example, compose files, README.md, Dockerfile if required, tests/config.test.ts and this plan.
- [ ] Update startup/configuration docs, backup/restore and Google setup instructions, current callback URI and future domain migration steps. Confirm native SQLite migration and existing vault/Sync persistence remain separate.
- [ ] Run full test suite, npm run check, npm run build and diff checks. Obtain one independent final review and fix material findings with regression tests.
- [ ] Prepare Google OAuth client and production secrets without putting secrets in source or chat. If Google console access or owner consent is required, prepare the concrete action and hand it to Wilson while completing independent work.
- [ ] Back up existing state before cutover; deploy only after configured SSO is ready. Verify real owner login, wrong-account denial, actual ChatGPT discovery/read, refresh and revocation. Preserve the original deployment as rollback; do not claim live success without these checks.

## Execution notes
Per-task local verification precedes a final reviewed commit; defer pushes until deployment configuration is ready because main auto-deploys. Native execution was selected to fulfill Wilson's explicit go-ahead without another approval round. The implementation plan may record compatibility rulings in its ignored ledger.
