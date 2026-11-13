# Owner Google sign-in

Create your own Google OAuth Web application. Register the callback for the exact origin you run:

- Node development: `http://localhost:3000/api/auth/callback/google`
- Local Compose: `http://localhost:3010/api/auth/callback/google`
- Production: `https://brain.example.com/api/auth/callback/google` (replace with your origin)

Set `PUBLIC_ORIGIN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BRAIN_OWNER_EMAIL`, and a random `BETTER_AUTH_SECRET` of at least 32 characters. Generate the secret with `openssl rand -hex 32`. Store credentials only in your backend environment or secret manager. Configure the Google consent screen/test users as required by your own Google project.

The first successful sign-in requires a verified email matching `BRAIN_OWNER_EMAIL` and pins Google's stable subject. Subsequent logins require that subject, even if its email changes. Changing `BRAIN_OWNER_EMAIL` does not transfer ownership. There is no password signup, public registration, or account-linking path. Do not delete the auth database to work around a login problem: it contains the pinned identity, sessions, and client grants.

Use your canonical frontend origin as `PUBLIC_ORIGIN`, including when Vercel fronts a separate backend. OAuth issuer and resource URLs derive from it. Origin changes require callback updates and client reconnection; old-resource bearer grants are rejected. Preserve the authentication secret and state through routine restarts.

MCP clients use OAuth with S256 PKCE, owner consent, the `brain` scope, and `/mcp` resource binding. The MCP authentication challenge also requests `offline_access` so clients receive a refresh token and can renew expired access without another login. Grants previously issued without a refresh token need a fresh OAuth authorization after upgrading. Public client registration creates client metadata, not permission to read the vault. Client names are unverified. Confirm the callback and requested permissions before consenting. The Account page lists authorized apps and can revoke their grants. Browser sign-out is not a substitute for revoking an offline-capable app.

Before using real notes, verify synthetic owner login, anonymous API rejection, consent cancellation, MCP access, token refresh, revocation, and restart persistence. Automated tests mock Google's code exchange and do not verify your live Google project.
