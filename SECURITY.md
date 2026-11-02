# Security and privacy

## Report privately

Do not put credentials, vault text, or exploit details in public issues or pull requests. Use the repository's **Security → Report a vulnerability** option when available. If private reporting is unavailable, contact the maintainer through their GitHub profile to arrange a private channel before sharing details. There is no guaranteed response SLA.

## Trust model

This is a single-owner service. Google sign-in pins one owner; browser mutations require same-origin CSRF checks. OAuth clients need owner consent, PKCE, the `brain` scope, and the configured MCP resource. A bridge secret authenticates the optional forwarding hop; it does not replace user authorization. Public demonstrations contain synthetic data.

An authorized MCP client can read **all indexed notes** and use the mutations permitted by the owner/service. There are no tenant, per-client folder, or read-only OAuth scopes. Approve only clients you trust with the whole vault. Metadata and returned source text are untrusted data, not instructions. Client names and submitted evidence are not independently verified by the server.

The filesystem and runtime account are trusted. Use one process and one server vault, with writes and Obsidian sync passing through the service queue. Hidden paths, traversal, symlinks, and operational policy files are rejected where applicable. This does not sandbox an attacker who already controls the host or can swap filesystem entries during an operation. Independent writers and network filesystems with incompatible locking/atomic operations are unsupported.

## External model disclosure

`search` and `inspect` do not call Jev. `recall` sends its query, eligible note excerpts, and comparison context. `assess_memory` sends the candidate, source metadata/excerpts, current note, and up to five eligible related notes. Connection suggestions send pairs of eligible notes. Do not put restricted information into a query or source excerpt: the service cannot infer the privacy of arbitrary submitted text. Original evidence URLs are not fetched.

Canonical frontmatter keys are `sensitivity`, `portability`, `scope`, and `contains_client_data`. Values are normalized for case and surrounding whitespace. Malformed metadata, noncanonical privacy-key casing/whitespace, unknown sensitivity/portability labels, and client-containing notes are excluded. Allowed sensitivity labels are `normal`, `personal`, and `public`; absence defaults to `normal`. Portability may be absent or `portable`; `internal` is excluded. Work/client scopes need explicit `portable` classification and must contain no client data. Sensitive notes should use `internal`, `confidential`, `restricted`, or `private` sensitivity. Do not change labels merely to force disclosure.

Unlabeled notes remain eligible by default, so classify the server vault before enabling Jev. Exclusion is **not a client read-access control**: an authorized agent can still inspect these notes and its own provider may receive them. Keep restricted material out of any instance whose clients are not permitted to receive it.

Enabled commits do not consult a model. Privacy routing, protected paths, expected revisions, and exact retry checks remain enforced. Agents are responsible for truthful source verification and permitted changes. Jev advice and scores are not proof or permission.

## Operate safely

- Use HTTPS, a strong authentication secret, your exact canonical origin, and a separate secret for an optional bridge. Keep provider keys on the backend. Disable private backend access in public preview deployments.
- Restrict vault/state/config directories to the runtime account. The app restricts its state directory and creates runtime files with a private umask. Host administrators can still read them; SQLite/vault files are not encrypted by the app.
- Treat SQLite auth/history/assessment files and backups as sensitive. History retains earlier Markdown and evidence after a current note is edited or removed. There is no automatic retention purge.
- Preserve vault, state, and sync configuration in consistent encrypted off-host backups. Stop the service or use a proper snapshot/SQLite backup, and test restore into an isolated instance. Sync and same-disk copies are not disaster recovery.
- Keep one replica; let the queued sync finish during shutdown. Use edge-level request limits for a public endpoint. Auth-library rate limits and body/time limits do not provide comprehensive denial-of-service protection.
- Keep dependencies and the container base image current. `npm audit` covers the npm dependency graph, not the host, container OS, optional globally installed CLI, or every unknown vulnerability.
- Before publishing changes, scan the working tree and reachable Git history for secrets. Removing a file from the current tree does not remove it from history, forks, caches, or old build artifacts. Revoke confirmed exposed credentials first; plan any history cleanup separately.

The tests use synthetic data and local providers. They do not certify a deployment, provider configuration, hardware, backup service, or running client.
