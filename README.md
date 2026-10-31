# Brain Companion

An Explorer for an Obsidian vault, plus a shared memory MCP service. Agents write final Markdown; Jev evaluates proposals; the browser shows notes, connections, sources, and changes.

## What is implemented

- Graph, Pages, Changes, and Jev Recall views, with search, backlinks, sources, change diffs, graph pan/zoom, folder filters, and a focused neighborhood.
- Explicit synthetic demo at `/demo`. The normal route requires the owner password and never falls back to fake live data.
- Official MCP SDK tools: `recall`, `inspect`, and `remember`, plus `brain://guide` and the `memory-workflow` prompt.
- One shared brain. Single-owner browser sessions and OAuth authorization with S256 PKCE, resource binding, dynamic client registration, hashed opaque tokens, rotating refresh tokens, and revocation.
- Persistent Markdown files and SQLite operation history. Revision checks, serialized writes, idempotency, a write journal, atomic replacement, and retained conflict/uncertain proposals.
- Jev System One adapter with a worth-remembering gate, memory categories, recall evidence/conflict review, reviewed connection suggestions, strict result validation, recorded usage/model/question version, and a budgeted evaluation runner. No backend text generation.
- Optional Obsidian Headless one-shot sync in the same queue as writes. Sync status is separate from server write status.
- Vercel frontend and forwarding function; Docker/Compose service with persistent volumes.

Instant search is keyword based; the explicit Recall action and MCP `recall` use Jev to assess up to eight shortlisted notes. Categories filter classified notes and proposals. Dotted graph edges are suggestions; review both notes and the exact appended link before saving. Save/dismiss are authenticated, CSRF-protected owner actions with revision checks and journaled writes. The graph uses a deterministic force layout of actual resolved links, with collision-filtered labels, scroll zoom, pan, and neighbor highlighting. The simulation settles once when its connections change; it does not animate continuously. Graph display is bounded to 200 notes per view. Semantic retrieval/QMD is not implemented. The changes view shows the most recent 100 operations; older records remain addressable by operation ID.

**Evaluation status:** the frozen Brain-derived gate passed on 286 development cases and a fresh 50-case holdout: 92.9% held-out memory accuracy, 100% category/worth/recall accuracy, and 100% connection precision with 80% coverage. Automatic memory writes remain disabled; links require review. See [results, iteration history and limits](docs/jev-features.md).

## Try the Explorer

Requires Node 24 or newer.

```sh
npm ci
npm run build
npm start
```

Open `http://localhost:3000/demo`. No credentials or private notes are needed. The root route explains that the live service is not configured. The source release also includes `brain-explorer-demo.html`, a self-contained build of the same UI using sample data that can be opened directly.

```sh
npm test
npm run check
npm run build
```

Tests exercise real temporary vaults, SQLite restart behavior, the OAuth and MCP request handlers, bridge routing, safe Markdown rendering, and sync/write serialization. See the [deployment checkpoint](docs/deployment-status.md) for live deployment checks and remaining credential-dependent verification.

## Configure a local private service

```sh
cp .env.example .env
npm run password
```

Copy the generated `BRAIN_PASSWORD_HASH` into `.env`. The command reads the password without displaying it. Keep the password in your password manager; it signs in to the Explorer and approves MCP clients. For local development, use `PUBLIC_ORIGIN=http://localhost:3000` and leave `BRAIN_BRIDGE_KEY` empty. Put a few non-sensitive notes in the configured `VAULT_PATH`, then run `npm start`.

Set `JEV_API_KEY` only on the persistent service. Missing or failed Jev evaluation retains a proposal and never silently accepts it. The API key is not part of the browser bundle or Vercel environment.

`AUTO_ACCEPT` is empty by default. Every proposed new/update memory stays in the change log until you enable a category. Evaluate the classifier on representative labeled examples first. Set `AUTO_ACCEPT=new` or `AUTO_ACCEPT=new,update` when ready; this is a server configuration, not a web approval flow. Existing retained proposals are not automatically replayed when the setting changes.

Jev receives the proposed text, source metadata and optional evidence excerpts, current page, and up to five eligible related pages. Two requests separate evidence comparison from memory value/category classification. Existing internal, client-marked, restricted and policy notes are excluded from external assessment. It does **not** fetch the original evidence URLs. Scores are model judgments, not verified probabilities of truth. Its output never overrides revision checks or protected paths.

## Deploy

Use a single persistent service instance plus Vercel. Do not put the writable vault or SQLite database on a Vercel function filesystem.

### Temporary local Docker

After creating `.env` and its owner password hash, start the same backend locally:

```sh
docker compose -f compose.yaml -f compose.local.yaml up -d --build
```

Open `http://localhost:3010` and sign in with the owner password. The override permits HTTP on localhost and removes the Vercel bridge requirement; the host port remains bound only to `127.0.0.1`. The base production settings remain unchanged.

The named volumes preserve the vault, SQLite state, and Obsidian Headless account files across restarts and container replacement. Do **not** use `docker compose down -v`: it deletes those volumes. Use the Obsidian setup commands below against this separate container vault, never the desktop app's existing sync directory. Add `JEV_API_KEY` to `.env` when available; proposals remain retained if evaluation is unavailable.

This is a temporary Mac-dependent deployment. Docker must be running and the Mac awake. The hosted Vercel Explorer stays on its existing demo until an HTTPS tunnel or hosted backend is connected. Remote agents cannot reach `localhost`; connecting them requires that HTTPS route, the production Compose settings, and the canonical Vercel OAuth origin. Do not expose the localhost override through a public tunnel.

### Hosted backend

1. Deploy this Docker image on a small host with a persistent disk and an HTTPS reverse proxy. `docker compose up -d --build` exposes the worker only on the host's `127.0.0.1:3010`; point the host's HTTPS reverse proxy there. The worker must be reachable by Vercel over HTTPS.
2. Generate a random bridge secret, for example `openssl rand -hex 32`. Store it in the worker and Vercel as `BRAIN_BRIDGE_KEY`.
3. Set worker `PUBLIC_ORIGIN` to the final Vercel/custom origin, `BRAIN_PASSWORD_HASH`, `JEV_API_KEY`, and the chosen `AUTO_ACCEPT`. Compose pins the paths to `/data/vault` and `/data/state` regardless of development paths in `.env`.
4. Create the **brain-companion** project in the personal Vercel account. Import this folder, use Other as framework, `npm run build` as build command, and `dist` as output. `vercel.json` configures the bridge and routes. Set `BRAIN_SERVICE_URL` to the worker's HTTPS origin and `BRAIN_BRIDGE_KEY` to the same secret. Scope private service values to production only unless a preview intentionally gets its own isolated vault.
5. Deploy. Visit `/demo`, sign in at `/`, and verify anonymous `/api/brain` is rejected and `/mcp` advertises OAuth. Recheck authorization against the **final** canonical origin, because tokens are bound to it.

Without worker environment variables, the Vercel UI and `/demo` work while private API requests return a setup error. This is intentional. Avoid Vercel's own interactive Deployment Protection on the final MCP endpoint, since a remote MCP client cannot complete that separate login. The application's OAuth and browser login remain required.

The Dockerfile pins Obsidian's official open-beta CLI to `0.0.14`; override with `--build-arg HEADLESS_VERSION=<version>` only after testing that version. Application dependencies are locked in `package-lock.json`. The Node 24 base image still tracks security updates through its tag.

### Render Hobby

Use one Docker web service on Starter ($7/month compute), with a **1 GB disk mounted at `/data`**. Keep the workspace on Hobby. Set `/healthz` as the HTTP health-check path and allow 150 seconds for shutdown so an in-flight one-shot sync can finish. The disk adds its own storage charge.

Set these worker variables, alongside the password hash, bridge key, and Jev key described above:

```dotenv
PUBLIC_ORIGIN=https://brain-companion-hazel.vercel.app
VAULT_PATH=/data/vault
STATE_PATH=/data/state
XDG_CONFIG_HOME=/data/config
SYNC_ENABLED=false
AUTO_ACCEPT=
```

On Linux, Obsidian Headless stores credentials and local vault registration under `$XDG_CONFIG_HOME/obsidian-headless`. This keeps them on the **same disk** as Markdown and SQLite. Attach the disk before authenticating or syncing. Render mounts it only at runtime, so run `ob login` and the sync commands below in the service's **Shell**, not a build command or a one-off job. Keep automatic sync off until the first manual sync succeeds, then set `SYNC_ENABLED=true` and deploy.

Verify persistence by recording a real note's revision, the latest operation ID, and an authenticated browser/OAuth session before restarting the Render service. After restart, check the same note and operation, reuse the session and refresh token, and confirm a fresh successful Obsidian sync without logging in again. Only then consider the deployment verified. Disk-backed deploys briefly interrupt service; run only one instance.

Vercel receives only `BRAIN_SERVICE_URL` and `BRAIN_BRIDGE_KEY`, scoped to **production**. The public OAuth issuer and resource stay on the Vercel origin. The Docker image and these environment variables also work on Railway with a volume at `/data`; no Render SDK is required.

The frontend is deployed in the personal Vercel account at [brain-companion-hazel.vercel.app/demo](https://brain-companion-hazel.vercel.app/demo). The demo uses clearly labeled sample notes and activity. See the [deployment checkpoint](docs/deployment-status.md) for backend, real-vault sync, and agent connectivity status.

## Connect Obsidian Sync

Use the **server's separate vault copy**, not the same folder that the desktop app already syncs. This requires an active Obsidian Sync subscription. Back up the vault first.

With the Compose service running and `SYNC_ENABLED=false`:

```sh
docker compose exec brain ob login
docker compose exec brain ob sync-list-remote
docker compose exec brain ob sync-setup --vault 'YOUR REMOTE VAULT' --path /data/vault --device-name brain-companion
docker compose exec brain ob sync-config --path /data/vault --conflict-strategy conflict
docker compose exec brain ob sync --path /data/vault
```

Enter any encryption password interactively, rather than putting it in shell arguments. The `headless-home` volume keeps the CLI's account configuration; the vault volume keeps the vault and its local Sync configuration.

Then set `SYNC_ENABLED=true` and recreate the service. For temporary local Docker, keep both Compose files so the localhost origin and login continue to work:

```sh
docker compose -f compose.yaml -f compose.local.yaml up -d --force-recreate --no-build brain
```

For the production Compose configuration, use `docker compose up -d`. A plain `restart` does not apply changed environment variables. Both configurations reuse the existing named volumes. The service runs bounded one-shot sync jobs, never `ob sync --continuous`, so its own writes cannot overlap its sync process. Do not run additional sync writers against these volumes. An `applied` operation means the server file was written; it does not claim every desktop or phone has already received it.

## Connect ChatGPT and other agents

1. In a ChatGPT account with custom MCP/developer-mode support, add the deployed `https://YOUR-DOMAIN/mcp` as the remote MCP server and select OAuth.
2. The client discovers protected-resource and authorization metadata. Dynamic registration supports public clients and `client_secret_post` clients.
3. The Brain consent screen names the requesting client and its exact callback. Enter the owner password only for a connection you initiated.
4. Read `brain://guide` or request `memory-workflow`. The same portable instructions are in [docs/agent-guide.md](docs/agent-guide.md).
5. Ask the agent to recall a subject, inspect a page, then submit a sourced `remember` proposal. Confirm the operation in Changes. Start a fresh conversation and recall the same subject.

The server has one `brain` scope, not separate company/person access. All connected clients can read all indexed notes and propose writes. This OAuth implementation is intentionally single-owner: no invitations, organizations, password recovery, or client-management UI.

To revoke a client, use `/oauth/revoke` with its client credentials and a current access or refresh token. To invalidate **all** connections and browser sessions in an emergency, stop the service and delete rows from the `auth` table, then restart; this does not delete note/history tables. Changing only the owner password does not revoke existing sessions or grants.

## Evaluate Jev

Use a pinned model and keep automatic writes disabled:

```sh
JEV_MODEL=jev-1.14.0 npm run evaluate -- tests/fixtures/jev-smoke.json
JEV_MODEL=jev-1.14.0 npm run evaluate -- data/evals/brain-cases-v6.json dev
JEV_MODEL=jev-1.14.0 npm run evaluate -- data/evals/brain-cases-v6.json holdout
```

The six-case fixture is synthetic integration smoke coverage. The private Brain dataset is deliberately ignored and is not distributed with the public app. It contains source references, minimized excerpts, label rationales, authored counterfactuals/injections, and a source/topic-separated holdout. See [the frozen gate and implementation scope](docs/jev-features.md).

The runner evaluates memory, recall and connection cases without writing notes. It pins model/question and dataset hashes, validates inputs, caches exact model requests privately, and enforces the cumulative 2,000-request task budget in `data/evals/budget.json`. It reports exact memory outcomes, memory-value/category accuracy, unsafe acceptances, recall precision/coverage and unsafe routing, connection precision/coverage, failures, usage and latency. Missing roles or all-negative predictions cannot pass. Cached development calls are not independent trials. No successful small evaluation establishes production-wide accuracy.

Reports and excerpts stay in `data/evals/`, excluded from Git, Docker and Vercel uploads. Source excerpts preserve attribution, time and uncertainty; client data, credentials, raw transcripts and third-party personal details are excluded. Held-out cases must not guide tuning: retire a failed holdout and construct a fresh one if further tuning is needed.

This task used 1,834 of the authorized 2,000 requests. The final untouched holdout passed; it is now observed, so rerunning it is regression checking, not fresh validation. Any further tuning requires a new source/topic split and must remain within the authorized cumulative budget. Do not reset the counter or weaken the gate.

The temporary synthetic MCP/SQLite workflow can also be checked with `scripts/test-jev-workflow.ts`. The owner-reviewed connection integration tests cover save/dismiss, stale revisions, restart recovery, idempotency, protected paths and CSRF without contacting the live vault.

## Backup and recovery

Keep backups of **both** vault files and SQLite state. The state includes proposals, change history, and authorization records. Files can remain useful without the database, but source envelopes and operation history cannot be reconstructed completely from Markdown alone.

For a consistent simple backup:

1. `docker compose stop brain` and confirm it stopped. Do not copy an actively changing SQLite database on its own.
2. Export all three named volumes (`vault`, `state`, `headless-home`) with the host's volume-backup mechanism. Encrypt backups; the CLI configuration and OAuth state are sensitive.
3. Restart with `docker compose start brain`.
4. Test restoration into separate volumes and an isolated service with `SYNC_ENABLED=false` and no public ingress. Inspect notes and changes before allowing the restored copy to sync.

Never run two active services against the same vault/state volumes. After interruption, the next vault scan reconciles journaled pending writes against their submitted hashes. Read the current page and operation before retrying with a new payload.

## Boundaries

The web app supports only reviewed link additions; it has no general text editor, memory-proposal approval, rollback, ingestion, or chat. There is no hidden LLM rewriting step. Policy files (`AGENTS.md`, `BRAIN.md`, `CONTEXT.md`, `SKILL.md`, `CLAUDE.md`, `GEMINI.md`, `README.md`), hidden paths, symlinks, and underscore-prefixed folders are blocked for MCP writes. Attachments are rendered as labels, not fetched or executed. Raw Markdown HTML is shown as text.

Do not expose this initial single-owner service as a public multi-user product without further security review, operational limits, and load testing.
