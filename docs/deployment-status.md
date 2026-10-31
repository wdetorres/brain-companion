# Deployment checkpoint

Updated 2026-10-31 (Asia/Manila).

## Completed

- Published all 54 tracked source files from local main at `9d7b5f7`, with the small deployment changes, to the private repository `wdetorres/brain-companion`.
- Published application commit: `4d5e68cfab6178498a09e6ef3da168758392592f`.
- Pinned official Obsidian Headless to `0.0.14`; Docker health check uses `PORT`.
- Documented one Render disk at `/data`, with vault at `/data/vault`, SQLite at `/data/state`, and `XDG_CONFIG_HOME=/data/config` for Obsidian credentials/registration.
- Verified 27 tests, TypeScript check, production build, and `git diff --check`.
- Generated owner password/hash and bridge key in the gitignored local `.env` (mode 0600). `BRAIN_OWNER_PASSWORD` is for the owner and verification only; do not send it to Render or Vercel. Keep it in a password manager.
- Saved `BRAIN_BRIDGE_KEY` as a sensitive, production-only Vercel variable.
- Existing monochrome UI remains at https://brain-companion-hazel.vercel.app. No frontend redeploy in this session.

## Immediate blocker

Render MCP works in workspace `tea-dbinvp0u01pc73dfr990` (My Workspace), but service creation was rejected because Render cannot fetch the private repository. No service was created and no disk was provisioned.

The existing Render deployment credential identifies `wdetorres`, but only has access to an unrelated repository. The GitHub Render installation page is staged with **only** `wdetorres/brain-companion` selected. Installing grants new repository access and needs user confirmation at that action.

## Resume

1. Complete the Render GitHub app installation scoped to this repository.
2. Use Render MCP to create one Docker web service: `brain-companion`, `main`, Singapore, Starter ($7/month compute), on the existing Hobby workspace. Keep automatic deploys off during setup.
3. Set the existing hash/key from `.env`, the canonical Vercel origin, the persistent paths above, `PORT=3000`, `HOST=0.0.0.0`, `SYNC_ENABLED=false`, and empty `AUTO_ACCEPT`.
4. Attach a 1 GB disk at `/data` in the dashboard (the MCP tool has no disk capability). Configure `/healthz` and a 150-second shutdown delay. Verify filesystem write permission on the mounted disk.
5. Set the actual Render HTTPS URL as Vercel's production-only `BRAIN_SERVICE_URL`, then redeploy the existing Vercel project `prj_Wk2y2R5MThgBhkiSGQk5GrUVIZlc` in `team_QuB3ofEQtT1zmI46VJ9iBMna`.
6. Obtain the Jev key securely and set it only on Render. Keep auto-accept disabled until a representative evaluation is complete.
7. Authenticate Obsidian interactively in the Render service Shell, choose the real remote vault, configure conflict copies, and perform the first sync. Credentials were not available locally and no real-vault data was copied. Then enable scheduled sync and deploy.
8. Verify browser login, anonymous rejection, OAuth discovery/PKCE/token/refresh, and MCP tools through the canonical Vercel URL. Connect ChatGPT and verify recall in a fresh conversation.
9. Restart Render and verify note revisions, operation history, auth tokens, and Obsidian login/sync survive. No live persistence result is claimed yet.

## Source-control boundary

The shell cannot resolve GitHub and local `.git` is read-only in this session. Publishing used the GitHub connector, so remote history begins with a source snapshot, not the original local commit ancestry. Local `main` remains at `9d7b5f7` with Dockerfile/README changes and this checkpoint. Do not force-push the local branch over remote main; fetch and reconcile the histories in a normal terminal before further git-based work.
