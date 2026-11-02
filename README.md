# Brain Companion

A personal second brain shared across your agents, with Markdown notes and a browser for exploring them. Built for one owner and their authorized MCP clients; others can run their own instance. This is a self-hosted personal project, with no shared signup service or tenant isolation.

Agents read sources, check duplicates, and write final Markdown. Optional Jev assessments provide advice about quality, recall, and connections. Enabled writes commit the agent's text without a model approval gate. Notes remain usable in Obsidian.

## Try the sample Brain

Requires **Node 24 or newer** and npm. From a clean checkout:

```sh
npm ci
npm run build
npm start
```

Open [localhost:3000/demo](http://localhost:3000/demo). It uses explicitly synthetic notes and activity, needs no credentials, and makes no live vault or model requests. Without authentication configuration, private APIs are unavailable. `dist/brain-explorer-demo.html` is the same sample app as a portable file.

The standalone server serves the Explorer at `/`; Vercel builds serve the public landing page there and the Explorer at `/app`. Both serve `/demo`, `/mcp`, and the same owner authentication routes.

## Run your own private Brain

```sh
cp .env.example .env
mkdir -p data/vault/Projects
printf '# Example\n\nA synthetic note for setup verification.\n' > data/vault/Projects/Example.md
```

Create your own Google OAuth **Web application** client with callback `http://localhost:3000/api/auth/callback/google`. In `.env`, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BRAIN_OWNER_EMAIL`, and `BETTER_AUTH_SECRET` (generate with `openssl rand -hex 32`). Keep `PUBLIC_ORIGIN=http://localhost:3000`. Then run `npm start` and sign in at `/app`.

The first successful login pins the configured owner's verified Google subject. Another Google account cannot take over that instance. See [Google sign-in](docs/google-sso.md) for production callbacks and identity changes.

Keep `VAULT_PATH` and `STATE_PATH` outside version control; the default `data/` is ignored. Use a separate server vault, never the folder already synced by a desktop Obsidian process. Keep `AUTO_ACCEPT` empty and `SYNC_ENABLED=false` until synthetic tests and backups are ready. Set `AUTO_ACCEPT=new,update` to permit captures and edits; add `promote` only if you want Inbox filing. These settings do not disable explicit connection review, claims, or other authorized mutations.

A Jev key is optional. Search, inspection, and enabled writes work without it. Set `JEV_API_KEY` only on your backend if you want advisory assessments, assessed recall, and connection suggestions. Those operations send selected text to an external service and may incur charges. Read the [privacy and trust boundaries](SECURITY.md) before enabling them.

## Connect an agent

Deploy your own HTTPS service, add **your origin + `/mcp`** to a compatible remote MCP client, and complete owner OAuth. Install the [four portable workflows](docs/skill-migration.md) or use the served `brain://guide`. A skill does not supply credentials or access to anyone else's Brain. This repository does not grant access to the maintainer's personal service.

Start with `brain_status`, bounded `search`, and `inspect`. Use synthetic notes to verify a capture and an exact retry before connecting private sources. The [agent guide](docs/agent-guide.md) covers assessment advice, commits, review, undo, and filing. [Architecture and limits](docs/harness.md) describe the single-owner model.

## Deploy

Use one persistent Docker service behind HTTPS. Run **one replica** and mount a writable disk at `/data`. Set `PUBLIC_ORIGIN` to your canonical HTTPS origin, configure Google sign-in, and retain `/data/vault`, `/data/state`, and `/data/config`. The image runs as the `node` user. Use `/healthz` for health checks and allow 150 seconds for shutdown.

For local Docker, configure `.env` with the callback `http://localhost:3010/api/auth/callback/google`, then:

```sh
docker compose -f compose.yaml -f compose.local.yaml up -d --build
```

The host port is bound to `127.0.0.1`. The local override permits localhost HTTP; do not expose it through a public tunnel. Named volumes survive container replacement. `docker compose down -v` **deletes those volumes**.

The optional Vercel frontend uses `vercel.json`. Set only `BRAIN_SERVICE_URL` (the backend HTTPS origin) and a random `BRAIN_BRIDGE_KEY` on Vercel. Set the same bridge key on the backend and use the Vercel/custom frontend origin as backend `PUBLIC_ORIGIN`. Scope these values to production; previews should have no private backend or their own isolated synthetic instance. Direct hosting needs no bridge key. `deploy/render-build-filter.json` is an optional backend-only filter for a split deployment; omit it when the Docker service also serves your UI.

### Optional Obsidian Sync

Obsidian Headless and Sync are separate proprietary software/services. The Dockerfile downloads pinned `obsidian-headless@0.0.14` for personal sync compatibility; it is **not covered by this project's MIT license**. To build without it, use `docker build --build-arg HEADLESS_VERSION= -t brain-companion .` and keep `SYNC_ENABLED=false`. Do not redistribute a CLI-containing image without the applicable rights; see [third-party notices](THIRD_PARTY_NOTICES.md).

With a backed-up, separate server vault and sync disabled, run in the container:

```sh
docker compose exec brain ob login
docker compose exec brain ob sync-list-remote
docker compose exec brain ob sync-setup --vault 'YOUR REMOTE VAULT' --path /data/vault --device-name brain-companion
docker compose exec brain ob sync-config --path /data/vault --conflict-strategy conflict
docker compose exec brain ob sync --path /data/vault
```

Enter passwords interactively. After manual sync succeeds, set `SYNC_ENABLED=true` and recreate the service using the same Compose files. A plain restart does not apply new environment values. The server serializes one-shot sync with its writes; do not run another sync process against that copy.

Back up the vault, SQLite state, and sync configuration together while the service is stopped, or use a consistent filesystem snapshot/SQLite backup. Raw copies of a live SQLite file without its WAL are unsafe. Store encrypted backups off the host, then test restoration in an isolated instance. Server write success and another device's sync success are different checks.

## Develop and verify

```sh
npm test
npm run check
npm run build
npm audit
```

Tests use temporary synthetic vaults, mocked Google code exchange, and mocked model responses. They cover authentication, OAuth/PKCE/revocation, CSRF, MCP, safe rendering, privacy exclusions, path validation, write retries/recovery, and sync serialization. They do not establish live Google login, paid model quality, host configuration, or off-host recovery. `npm run evaluate` explicitly sends its supplied dataset to Jev; use synthetic or separately authorized data and review the request budget first.

The source is in `server/` (auth, MCP, vault and history), `src/` (Explorer), `api/` (optional bridge), and `skills/` (agent workflows). Small, focused contributions should include relevant tests. Do not commit vaults, credentials, production captures, or internal operating records. Report security concerns privately as described in [SECURITY.md](SECURITY.md).

## License

Wilson-owned code, documentation, skills, and synthetic examples are [MIT licensed](LICENSE). Bundled dependencies, logos, fonts, and external services retain their own terms; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Product names and marks identify compatible tools and do not imply endorsement.
