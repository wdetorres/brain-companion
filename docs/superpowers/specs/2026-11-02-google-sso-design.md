# Google sign-in and ChatGPT consent

Status: approved by Wilson in this chat; Better Auth implementation authorized on the existing domain. Confirmed sole owner: detorres.wilson21@gmail.com.

## Intent and agreed scope

Brain Companion is private to Wilson and his existing vault. Replace the owner-password experience with Google sign-in. Use the same authenticated owner session for the web UI and the ChatGPT consent page. Keep the existing Obsidian Headless setup and show its sync status in the UI. Wilson owns wilsondetorres.com and plans to change the app domain later.

No public signup, additional users or vaults, Obsidian credential-entry wizard, password fallback, new sync process, or changes to the vault's content or write policies. The existing authorized whole-vault scope remains. Do not silently replace the existing MCP write access with read-only access or broaden it; the consent page must accurately describe the existing permissions.

## Approaches and proposed implementation choice

The discussion considered email/password accounts and Google sign-in. Wilson selected Google sign-in: account recovery and credential verification stay with Google, while Brain Companion authorizes access to the vault. A separate Obsidian web setup wizard was considered and declined; retain the existing server setup.

Approved implementation choice: use Better Auth on the existing Node worker for Google login and sessions, plus its maintained OAuth/MCP provider support for delegated access. Its current documentation covers Google callbacks, explicit login and consent pages, PKCE, discovery, resource binding and revocation. Validate compatible package versions, Node SQLite support, and the actual ChatGPT protocol/registration path before committing to the integration. Keep the existing React/esbuild frontend and Vercel-to-Render bridge.

Alternatives are (1) adding Google authentication while retaining the custom OAuth issuer, which is a smaller patch but retains custom security and protocol maintenance, and (2) a managed identity/OAuth service, which transfers more operational responsibility to a vendor but adds another configured service. Recommendation: the maintained library in the existing worker. If its compatibility check fails, bring back the specific issue and recommended alternative rather than silently building another custom issuer or provisioning a paid service.

## User flows

### Web sign-in

An anonymous visit shows a branded Brain Companion page with Continue with Google. Google performs credential entry on Google's own page. On return, the worker validates the identity and owner authorization, establishes an HTTP-only secure session and opens the dashboard. No Google password is collected by Brain Companion.

Only one explicitly configured Google identity may access the app. Never grant ownership to the first visitor or to anyone with a Google account. Bootstrap from an explicitly confirmed verified Google account, then persist its provider subject identifier; do not use an editable profile name or an unverified email as identity. Reject other identities before granting a session usable for private API access. Keep the owner check at the API boundary as well as during sign-in. The exact owner account must be confirmed before production configuration; the email used for hosting is not sufficient proof of the intended Google identity.

Show useful states for cancellation, expired sign-in, unavailable service and unauthorized account, including an option to try a different account. Never expose raw tokens or internal errors. Signing out ends the browser session; it does not stop Obsidian Sync or revoke an existing ChatGPT grant.

### ChatGPT connection

ChatGPT initiates a normal OAuth request at the configured MCP endpoint. Validate the client and redirect before starting owner sign-in. Bind the pending authorization transaction to the browser using the library's supported mechanism; preserve it through Google login without putting arbitrary return URLs or permission decisions under browser control.

If signed out, show the same login page with a short explanation of the pending connection. If already signed in as the owner, proceed directly to consent. The consent page displays the signed-in identity, the requesting client's identity, requested permissions, Connect and Cancel. Untrusted client display names are escaped and are not proof that a client is ChatGPT; use validated client registration/metadata and callback details. Consent is bound to the exact validated transaction and protected against CSRF. Google login alone must not approve a client.

Connect submits once, shows pending feedback, and returns the authorization result to the validated ChatGPT callback. Disable duplicate UI submission; server-side single-use authorization remains authoritative. Expired transactions get a clear restart instruction. Cancel returns a standards-compliant denial to the validated callback. No browser session or Google token is handed to ChatGPT; it obtains a Brain-specific access token through code exchange and PKCE.

Keep client access visible in a small Connected apps section, with permissions and a revoke action. An issued grant is Authorized; do not present it as a proven working integration. Only actual successful MCP use is evidence of use, and lack of use does not prove a client is broken. Revocation must block both new calls and refresh for that grant. The dashboard may link to ChatGPT setup instructions, but cannot fabricate the pending client request or complete ChatGPT installation itself.

### Obsidian status

Reuse worker sync state and the last successful sync already exposed by the authenticated API. Show syncing, last success, not configured, or failure/staleness as supported by the actual worker state. Do not label a configured connection healthy without a successful sync, or claim all devices are current. Do not expose Obsidian credentials, account secrets, encryption material, shell access or raw logs. If repair is required, show concise guidance to use the existing server setup procedure. No login/logout, unlink or new sync controls are added.

## Architecture and security boundaries

Vercel remains the public UI and request bridge. Render remains the persistent vault worker and owns authentication state. The browser sees one canonical public origin. Bridge credentials remain server-only and direct worker access retains its existing protection.

Use one validated canonical origin configuration to derive auth base URL, discovery issuer, callbacks, MCP resource/audience and allowed browser origin. Do not derive trust from arbitrary Host or forwarded headers. Production is HTTPS; allow only explicitly configured development origins locally. Do not use wildcard production callback or CORS allowances. Discovery and the necessary login/callback routes must remain reachable anonymously; all vault reads, writes and status require owner session or the intended MCP grant.

Use the library's state, nonce, PKCE, session and CSRF protections. Configure exact callback validation, short-lived resource-bound tokens, supported refresh/revocation behavior, and durable server-side secrets/state. No tokens in localStorage, query-based bearer authentication, or content/secrets in logs. Request Google identity scopes only; no Drive/Gmail access or unnecessary offline Google access. Keep Google identity, browser session and MCP grant distinct.

The selected implementation must meet the requested revocation behavior. If bearer tokens are self-contained JWTs, validating signature/expiry alone is insufficient for immediate revocation: include a server-side active-grant check or a supported equivalent. Do not advertise immediate revocation if only eventual expiry is implemented.

Persist auth records and signing material on the existing durable worker storage using a supported library adapter. Prefer a separate auth database on that volume so the vault/state database and its existing tables are not needlessly migrated. This is a builder choice contingent on the library's supported adapters. No new database hosting is part of the agreed scope.

## Domain plan

For now use https://brain-companion-hazel.vercel.app. Suggested future name: https://brain.wilsondetorres.com; it is a proposal, not an instruction to change DNS. Keep wilsondetorres.com available for the personal website.

A later domain move changes the browser cookie origin and, with this simple same-origin design, the OAuth issuer and MCP resource. Plan for a new browser login and ChatGPT reconnection. Do not promise a transparent token migration or rely on HTTP redirects to carry authenticated MCP POSTs to a different origin.

Migration order: attach and verify the chosen subdomain and TLS; register its exact Google callback; prepare the app's canonical-origin configuration; cut over consistently; establish a fresh Google session and ChatGPT grant; verify a real tool call; retire the old app grants and callback/origin configuration. Use host-only cookies, not cookies shared with every wilsondetorres.com subdomain. A redirect from the old human-facing entry page may help, but is not an OAuth migration mechanism. Preserve rollback configuration and avoid changing origin in the middle of a pending authorization transaction.

## Implementation reach and rollout constraints

Changes will touch the frontend entry/session UI and consent view, auth initialization and runtime configuration, HTTP routing and private API checks, Vercel bridge allowlists/rewrites and required headers, MCP token validation, auth schemas, relevant tests, example environment configuration and operator documentation. Remove the current dependency of live-vault startup on BRAIN_PASSWORD_HASH when Google auth takes over. Do not accidentally start demo mode or stop sync because the old password variable is removed.

Before cutover, back up auth/application state and verify restoration without modifying the real vault. Prove the new flow in an isolated environment using synthetic notes. Explicitly retire old password login endpoints/sessions and legacy MCP grants on successful cutover; do not keep an undocumented bypass. Preserve Obsidian credentials, configuration, vault files, work history and sync scheduling. Remove the temporary MCP diagnostics as part of this change.

The existing authorized discovery requests returned HTTP 400. SSO does not establish a diagnosis or cure for that failure. No further production debugging is part of this planning task. Implementation acceptance requires proving protocol behavior through the actual Vercel bridge and ChatGPT; do not reopen production to clients merely because login works.

## Acceptance evidence

- Owner Google login works; another Google identity and anonymous requests cannot access any private API. Cancellation, stale transactions and sign-out behave predictably.
- Session expiry, CSRF/Origin protections, invalid callback/state/PKCE and replay rejection are exercised at the relevant boundaries.
- ChatGPT completes sign-in and explicit consent, discovers tools and executes a read against a synthetic note. Verify refresh and that revoked grants cannot call or refresh. Confirm existing write authorization/policies are not widened; use synthetic fixtures for mutation checks.
- Test the real bridge with the protocol versions and client registration method actually supported by the chosen ChatGPT configuration. Do not assume the newest SDK defaults alone establish interoperability.
- Obsidian status reflects worker evidence; auth migration does not reset its connection or change the vault.
- Demonstrate canonical-origin changes with two controlled test configurations, including exact callbacks, metadata, cookie boundaries and expected reconnection. No production DNS changes are required for this test.
- Run the relevant security/HTTP/bridge tests, TypeScript check and build. Review the final diff for secrets, diagnostic leftovers and old authentication bypasses.

## Decisions still needed

Better Auth and the sole owner account are confirmed. Google client credentials and live acceptance remain required before cutover. The future subdomain and migration date can remain deferred; they do not block implementation on the current origin.

## Sources checked

- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google provider in Better Auth](https://better-auth.com/docs/authentication/google)
- [Better Auth OAuth provider](https://better-auth.com/docs/plugins/oauth-provider)
- [Better Auth MCP provider](https://better-auth.com/docs/plugins/mcp)
- [OpenAI MCP authentication](https://developers.openai.com/plugins/build/auth)
- [Obsidian Headless authentication](https://obsidian.md/help/headless) and [Sync](https://obsidian.md/help/sync/headless)

These document current interfaces, not verified package compatibility or deployed behavior. Exact versions and settings must be checked during implementation.
