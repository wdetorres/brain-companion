# Hosting, sign-in and ChatGPT setup record

Updated November 2, 2026 (Asia/Manila), before the custom-domain migration.

This is the continuation point for the hosted setup. Completed steps below record this session's observed results; they are not a claim that every service was rechecked at this documentation checkpoint. [Deployment status](deployment-status.md) retains historical checkpoints, and [Google SSO operations](google-sso.md) explains auth setup and rollback.

## Current state

The live UI and MCP use **https://brain-companion-hazel.vercel.app**. The Render worker holds the vault and persistent state. Google sign-in and the ChatGPT connection passed live checks. The working ChatGPT app is now named **Brain Companion**, and the legacy app was uninstalled.

Wilson has authorized migration to **wilsondetorres.com**. Only preliminary inspection has begun: no domain, DNS, Google callback, canonical-origin or ChatGPT endpoint changes have been made for that migration. DNS ownership, existing website use and the exact Vercel DNS target still need verification.

### Resource map

| Component | Existing resource |
| --- | --- |
| Source | [wdetorres/brain-companion](https://github.com/wdetorres/brain-companion), production branch `main` |
| Vercel project | [brain-companion](https://vercel.com/wilsondts-projects/brain-companion), personal team `wilsondts-projects` |
| Vercel IDs | Team `team_QuB3ofEQtT1zmI46VJ9iBMna`; project `prj_Wk2y2R5MThgBhkiSGQk5GrUVIZlc` |
| Render workspace | My Workspace, `tea-dbinvp0u01pc73dfr990` |
| Render service | [brain-companion](https://dashboard.render.com/web/srv-dbjum4vf3r2c73d6g2q0), service `srv-dbjum4vf3r2c73d6g2q0` |
| Worker URL | `https://brain-companion.onrender.com` |
| Persistent disk | One 1 GB disk mounted at `/data`; one worker instance |
| Persistent paths | Vault `/data/vault`; state `/data/state`; Headless configuration `/data/config` |
| Google Cloud | Project `rugged-cooler-304004` (My First Project); app Brain Companion; External / Testing |
| Owner | `detorres.wilson21@gmail.com`; first verified login pins the stable Google subject |
| Working ChatGPT app | [Brain Companion settings](https://chatgpt.com/settings/plugins-settings/plugin_asdk_app_6ae80aff04a08191982e37a532003fc7), app `asdk_app_6ae80aff04a08191982e37a532003fc7` |
| Retired ChatGPT app | `asdk_app_6ae7f0403a5c819196965a3c5d1d541d`; uninstalled, not permanently deleted |

Resource IDs and URLs are identifiers, not credentials. Never add secret values, cookies, tokens, passwords, vault excerpts or private backup contents to this document.

## Completed steps

### 1. Deploy the persistent worker and sync the vault

1. Selected the owner's **My Workspace** on Render and deployed the Docker web service from this repository.
2. Attached persistent storage before authentication. Set `VAULT_PATH=/data/vault`, `STATE_PATH=/data/state` and `XDG_CONFIG_HOME=/data/config` so vault files, databases and Obsidian Headless credentials survive replacement of the container.
3. Used the Render service's runtime Shell for Obsidian authentication and remote-vault setup. Wilson entered account/encryption passwords interactively. Passwords were not placed in command arguments or source.
4. Synced the full authorized vault, including client-related project notes, into the server's separate vault copy. The desktop vault was not mounted as the worker's writable directory.
5. Enabled the existing scheduled one-shot sync after manual setup. Subsequent hosted checks showed successful sync without reauthenticating Obsidian. The SSO migration preserved this setup and schedule.

The reusable commands are in [Connect Obsidian Sync](../README.md#connect-obsidian-sync). In Render Shell, run the `ob ...` commands directly; the README's `docker compose exec brain` prefix is for local Docker. Do not rerun vault setup on an already registered vault or add a second sync writer merely to check status.

### 2. Connect Vercel to Render

1. Configured the personal Vercel **brain-companion** project for this repository, with `npm run build`, output `dist`, and the routes in `vercel.json`.
2. Set production `BRAIN_SERVICE_URL` to the worker's HTTPS URL.
3. Stored the same private `BRAIN_BRIDGE_KEY` in Vercel and Render. Vercel's server-side `api/bridge.ts` attaches it when forwarding allowed API, auth and MCP routes; the worker verifies it. The browser never receives the key.
4. Set Render `PUBLIC_ORIGIN` to the public Vercel origin. This controls browser trust, Google callbacks, the OAuth issuer and the MCP resource. A Vercel `PUBLIC_ORIGIN` setting also exists, but the current bridge reads only the backend URL and bridge key; the worker owns the canonical auth configuration.
5. Connected repository `main` for automatic deployments. Source pushes can deploy both services, so coordinate configuration before pushing a cutover.

Persistent state belongs on Render, not the Vercel function filesystem. Google credentials and `BETTER_AUTH_SECRET` are worker settings; they are not frontend configuration.

### 3. Replace the original owner-password OAuth flow

1. The first ChatGPT setup used the original password-based issuer. Consent attempts produced origin and invalid/expired-consent errors, and a connected-account label did not establish usable tools. Those attempts were superseded by the approved SSO redesign.
2. Agreed on a single-owner Google login, a proper sign-in page, explicit app consent after login, and an Account & connections page. Kept existing Obsidian authentication in the backend and displayed its status in the UI.
3. Implemented Better Auth with its MCP/OAuth provider in commit `cf3683a`. Auth uses separate persistent `/data/state/auth.sqlite`; vault and operation history remain separate.
4. Restricted admission to the approved, verified Google identity and pinned its stable subject. Disabled password fallback and account linking. Retired the old password endpoints and `/oauth/*` authorization flow.
5. Added signed consent context, PKCE, resource-bound opaque access tokens, rotating refresh tokens, revocation, owner session/CSRF checks, and connected-app status. Google login alone does not approve ChatGPT; the owner must click **Connect** on the consent page.

The [approved design](superpowers/specs/2026-11-02-google-sso-design.md) and [completed implementation plan](superpowers/plans/2026-11-02-google-sso.md) record the implementation scope and checks. Their original “no domain changes” constraint describes that completed SSO task; the later domain migration is now separately authorized.

### 4. Configure Google and deploy SSO

1. Prepared Google Auth Platform in the owner's project with only `openid`, `email` and `profile` identity scopes. No Drive or Gmail access was requested.
2. Wilson accepted Google's terms and created the app and Web application OAuth client. The app remains in testing mode with the owner as its test user.
3. Registered the exact callback `https://brain-companion-hazel.vercel.app/api/auth/callback/google`.
4. Wilson saved the client ID and secret in the ignored local `data/google-sso.env`. Configured Render with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BRAIN_OWNER_EMAIL` and a stable random `BETTER_AUTH_SECRET`. Do not rotate that auth secret casually: it also protects stored provider tokens.
5. Created a private pre-SSO backup at `/data/backups/pre-google-sso-2026-11-02.tar.gz`, mode 0600, using a consistent SQLite backup and unchanged vault/Headless files. Extracted it into an isolated temporary directory and verified SQLite integrity and retained operation history. This is a same-disk rollback copy, not independent disaster recovery, and predates the new Better Auth state.
6. Deployed matching worker/frontend changes. Wilson completed the first Google consent grant and reached the dashboard. Verified the existing vault and successful sync remained available.
7. Cleared the unused production `BRAIN_PASSWORD_HASH` after the SSO cutover. Old password files retained privately for rollback are not the active login mechanism.

### 5. Fix the real proxy flow and verify ChatGPT

1. Created a replacement ChatGPT app, initially named **Brain Companion SSO**, because the original registration retained the retired issuer metadata.
2. Configured MCP URL `https://brain-companion-hazel.vercel.app/mcp`, OAuth with dynamic client registration, `brain` scope and `offline_access` as a base scope. The authorization issuer is `https://brain-companion-hazel.vercel.app/api/auth`; the callback is `https://chatgpt.com/connector_platform_oauth_redirect`.
3. The real browser flow exposed Node fetch replacing `Sec-Fetch-Mode` with `cors`, which prevented the expected authorization redirect. Commit `1133378` preserves browser metadata over the authenticated bridge and restores it only after bridge-key validation. A real-network regression covers navigation, fetch, missing metadata and spoofed headers.
4. Added bounded consent-failure diagnostics in `8535710`, without tokens, cookies or note content. Two initial consent-details loads failed despite valid signatures; local/public API checks and subsequent reload/fresh reconnect succeeded. The transient cause was not proven, and logging is not claimed as its fix.
5. Verified ChatGPT discovered **12 tools**. In the [live acceptance chat](https://chatgpt.com/c/6ae80df3-d31c-83ec-830f-3336289e607d), `brain_status` and `inspect("BRAIN.md")` succeeded without writing vault notes.
6. Revoked ChatGPT from Account & connections. Its next request required reconnection. A fresh consent page loaded, a single **Connect** click returned to ChatGPT, and the resumed status call succeeded. A later status call also succeeded after the final worker restart.
7. Recorded the accepted cutover in `578d8b2`. At that checkpoint, **75 tests**, TypeScript, build and diff checks passed; independent auth review was completed. The last checked Render deployment was `dep-dbk0tq3ncjis73e41mp0`, and Vercel deployment was `7RDkpb8WZcyhbkxF9aErrtrEVyZa`, both for that commit.
8. At Wilson's request, uninstalled the superseded legacy ChatGPT app and renamed the working **Brain Companion SSO** app to **Brain Companion**. Verified the renamed settings page still showed the connected account. A new MCP call was not repeated solely for the rename.

### Verification boundaries

Real checks established owner Google login, successful worker sync status, ChatGPT tool discovery/read, revoked-access rejection and fresh reconnect. Synthetic integration tests cover non-owner rejection, refresh rotation/replay and denial of old tokens after reconnect. A live access-token-expiry/refresh cycle, a second real Google account, cross-device Obsidian convergence and load capacity were not exercised.

## Next: migrate the domain

**Status: pending.** Complete and record each item before marking the new domain live. Use the existing app, worker, vault and Google client; no new auth system or sync setup is needed.

- [ ] Inspect `wilsondetorres.com` authoritative DNS, existing website use and Vercel domain ownership. Resolve any existing-site conflict before replacing apex records. Record the chosen canonical hostname.
- [ ] Add the hostname to the existing personal Vercel project. Use the exact DNS target Vercel provides. Change only required records at the authoritative provider; preserve email and unrelated records, and avoid a nameserver migration.
- [ ] Verify DNS propagation and HTTPS certificate readiness for that hostname.
- [ ] Add the exact new Google callback `https://<canonical-host>/api/auth/callback/google` to the existing Web application client. Update applicable Google origin/branding settings without requesting new scopes. Keep the old callback only for a defined rollback window.
- [ ] Back up current `auth.sqlite` consistently and retain current configuration privately. The pre-SSO backup does not contain the current Better Auth state. Preserve the pinned owner, account, vault, operation history and Headless configuration.
- [ ] Coordinate Render `PUBLIC_ORIGIN`, any matching Vercel environment/configuration and old-host behavior. Keep the worker URL, bridge key, Google credentials, auth secret and sync settings unchanged unless a specific failure requires otherwise. Finish in-flight authorization before switching origins.
- [ ] Retire old browser sessions and MCP grants without deleting owner/account data. Ensure the old hostname cannot keep serving an independent authenticated app; redirecting the landing page alone does not migrate OAuth clients or audience-bound tokens.
- [ ] Sign in on the new hostname. Verify canonical discovery, owner login, anonymous denial, origin/CSRF boundaries, unchanged vault/history and fresh successful sync status.
- [ ] Update or recreate the ChatGPT MCP registration for `https://<canonical-host>/mcp`. Rediscover its issuer and use DCR with `brain` and `offline_access`. Complete explicit consent and verify a real status/read call; an “account connected” label alone is insufficient.
- [ ] Retire the previous ChatGPT registration only after the new connection works. Update this record, setup examples and deployment status with the final hostname, deployment IDs, acceptance results and rollback deadline.

If cutover fails, restore the previous canonical-origin configuration and matching routing/callbacks, then sign in and reconnect on the previous origin. Retired grants may require fresh consent. Do not restore an old vault snapshot over newer notes to undo an auth/domain change.

## Resume safely

- Check the current project/domain/environment state before acting; platform UI and DNS can change independently of Git.
- Use the personal Vercel account/team above. The locally available Vercel CLI wrapper was scoped to a corporate account during setup and was not suitable for this project; the personal dashboard was used when connector access failed.
- Local source is `/Users/wilson/projects/brain-companion`; the SSO worktree is `/Users/wilson/.codex/worktrees/brain-google-sso/brain-companion` on `codex/google-sso`. Check branch and working-tree status before commits. Both services track `main` for deployment.
- Credentials remain in ignored, mode-0600 local configuration and hosting secret settings. Do not include their values in status output or documentation.
- Record future changes here as completed only after observing the result. Keep pending work unchecked and state verification limits explicitly.
