# Deployment checkpoint

Updated 2026-10-31 (Asia/Manila).

## Current decision

Use local Docker temporarily. Paid Render deployment is paused at the owner's request. No Render service or disk was created. The workspace is still Hobby. The repository is public at https://github.com/wdetorres/brain-companion.

## Ready

- Published the application source, based on local main at `9d7b5f7`.
- Pinned official Obsidian Headless to `0.0.14`; Docker health check honors `PORT`.
- Added `compose.local.yaml`: localhost origin, development HTTP, no Vercel bridge secret required locally. The host port stays bound to `127.0.0.1:3010`; owner password authentication remains required.
- Reused the existing named volumes for Markdown, SQLite, and the Obsidian account home. The desktop vault is not mounted or copied.
- The generated password hash and bridge secret are in the ignored mode-0600 `.env`. The owner password is in ignored `data/owner-password.txt` (mode 0600), outside the container environment. Store it in a password manager.
- Saved the bridge key as a sensitive, production-only Vercel variable. The hosted monochrome UI remains at https://brain-companion-hazel.vercel.app; no backend URL or tunnel is connected.
- Verified 27 application tests, TypeScript, and production asset build during deployment preparation. Then validated both Compose configurations, localhost binding, all three volume targets, unchanged production bridge settings, exclusion of the plaintext owner password, and `git diff --check`.
- Reviewed the published source before changing visibility: no live credentials or real-vault files were included. Demo content is synthetic.

## Start locally

Run in a normal terminal, from the repository directory:

```sh
docker compose -f compose.yaml -f compose.local.yaml up -d --build
```

Open http://localhost:3010. This agent session cannot access the Docker socket, so the image build, service start, and live checks have not been performed. Do not use `down -v`; it deletes the data volumes.

## Remaining setup

1. Build/start Docker and verify `/healthz`, owner login, anonymous rejection, and MCP discovery.
2. Add the Jev key only to the local service's `.env`. Leave `AUTO_ACCEPT` empty until evaluation is complete.
3. With `SYNC_ENABLED=false`, authenticate official Obsidian Headless inside the container and select the real remote vault using the README commands. Keep this separate from the desktop vault. Enable automatic sync only after the initial manual sync succeeds.
4. Verify a container restart preserves notes, operation history, OAuth/browser sessions, and Obsidian login/sync. No live restart or real-vault result is claimed yet.
5. For remote agents and the hosted Vercel UI, connect a stable HTTPS tunnel to the **production** Compose configuration and set Vercel's `BRAIN_SERVICE_URL`. Do not expose the local override publicly. No tunnel was provisioned.

The Mac must remain awake and Docker running. Render or Railway can replace it later using the existing portable Docker image and persistent paths; resuming paid Render provisioning requires a new instruction from the owner.

## Source-control boundary

The shell cannot resolve GitHub and local `.git` is read-only in this session. Source publication used the GitHub connector, so remote history starts with a snapshot rather than the original local ancestry. Local main remains at `9d7b5f7` with deployment changes in the working tree. Do not force-push it over remote main; reconcile the histories in a normal terminal before further git-based work.
