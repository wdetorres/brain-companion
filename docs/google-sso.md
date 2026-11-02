# Google sign-in and OAuth operations

Current public origin: `https://brain-companion-hazel.vercel.app`. The sole approved owner is `detorres.wilson21@gmail.com`. No domain migration is part of this change.

## Google setup

1. In the owner's personal Google Cloud project, configure Google Auth Platform with the Brain Companion name, owner support/contact email, and External / Testing audience. Review Google's policy before accepting. Use only Google identity scopes (`openid`, `email`, `profile`); this app does not need Google Drive or Gmail access.
2. Add the owner as the test user. Create an OAuth client of type **Web application**. Set the exact authorized redirect URI to `https://brain-companion-hazel.vercel.app/api/auth/callback/google`. The optional JavaScript origin is `https://brain-companion-hazel.vercel.app`.
3. Store `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BRAIN_OWNER_EMAIL` and a random `BETTER_AUTH_SECRET` on Render, alongside the existing `PUBLIC_ORIGIN`. Never put secrets in source, browser code, logs, screenshots or chat. Keep `BETTER_AUTH_SECRET` stable across restarts.
4. Vercel keeps only the existing server-side `BRAIN_SERVICE_URL` and `BRAIN_BRIDGE_KEY`. Both public UI sessions and MCP authorization flow through the canonical Vercel origin to the worker. Register local callbacks separately if testing real Google login locally.

Better Auth owns Google verification, session cookies, signed authorization context, PKCE and token rotation. After the first verified owner login, `brainOwner` pins the Google subject. A different account with the same email string cannot replace it. Public routes expose neither password login nor account linking/client administration.

## Cutover and rollback

- First test against an isolated vault with `SYNC_ENABLED=false`. Never point a test instance at the existing live vault or Headless configuration.
- Back up the persistent vault, state and Headless config before cutover, using a stopped worker or the platform's consistent disk snapshot. SQLite backups must include a consistent database state; do not copy a live database alone. Restore into an isolated instance and inspect notes/history before permitting sync. Keep the previous app deployment and environment securely for rollback.
- The new `STATE_PATH/auth.sqlite` contains Better Auth users, accounts, sessions, consent, hashed opaque MCP tokens and the pinned owner. Migrations run at startup. Existing vault/history state and `/data/config` remain in place. No sync setup or scheduler settings change.
- The old password endpoints and `/oauth/*` issuer are retired. Legacy sessions, clients and tokens are not read by the new service. Configure SSO **before** switching versions; otherwise production deliberately refuses to start. Remove `BRAIN_PASSWORD_HASH` after successful cutover. Keep any old auth-state backup private until rollback retention ends.
- Deploy matching worker and Vercel versions. Reconnect ChatGPT using the same `/mcp` URL so it discovers the new issuer (`/api/auth`) and registers anew. Existing cached client registration may require removing/recreating the old ChatGPT connection.
- Verify owner login, non-owner rejection, explicit consent/cancel, real ChatGPT discovery and a synthetic read through Vercel. Verify refresh, revoke, and denial of old tokens after reconnect. The UI's “Authorized” status alone is insufficient.
- For rollback, restore the previous app version and its retained environment. Do not restore an old vault snapshot over newer notes merely to roll back auth. The new auth database is separate; a legacy rollback re-enables legacy credentials, so keep rollback access tightly controlled.

To revoke one app, use Account & connections. In an emergency, stop the worker and delete access/refresh/consent/session records from `auth.sqlite` in a transaction, retaining `brainOwner`, `user` and `account`. Restart and sign in again; existing notes/history are unaffected. Preserve a private backup first.

## Later domain change

Register the new exact Google callback before cutover; update `PUBLIC_ORIGIN`, deployment routes, Google branding/origin settings and the ChatGPT MCP URL together. Retire old sessions and MCP grants, then sign in and reconnect on the new host. Cookies are host-only. Redirecting the old web page does not migrate OAuth clients or audience-bound tokens. Keep a tested rollback window and make no origin changes during an authorization request.

## Local verification limits

Tests use synthetic Google code-exchange results to exercise profile admission, session creation and pending OAuth consent. They do not prove Google Cloud configuration or real ChatGPT compatibility. Rate limits intentionally use a shared per-path bucket on this single-owner service; untrusted forwarded IP headers are not used to bypass those limits. Load/abuse capacity is not established.

References: [Better Auth Google](https://better-auth.com/docs/authentication/google), [OAuth provider](https://better-auth.com/docs/plugins/oauth-provider), [MCP provider](https://better-auth.com/docs/plugins/mcp).
