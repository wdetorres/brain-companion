# Install the agent workflows

The portable workflows in `skills/` are:

| Skill | Purpose |
| --- | --- |
| `brain-recall` | Retrieve prior context with sources; read-only by default. |
| `brain-capture` | Verify evidence, obtain advisory feedback, and commit useful notes. |
| `brain-review` | Resolve authorized pending work using current claims and revisions. |
| `brain-maintain` | Read-only health checks or specifically authorized maintenance. |

Copy the selected skill folders into your client's supported skill directory, retaining their `references/` and metadata. Clients supporting Claude-style plugins can use the `skills/` package and its `.claude-plugin/plugin.json`. Folder installation and plugin support vary by client; consult that client's documentation. Do not install both the focused skills and the legacy `brain-harness` unless you intentionally need the compatibility procedure.

Connect the client separately to **your own** HTTPS `/mcp` endpoint and finish owner OAuth. These files contain no credentials, endpoint registration, hooks, or scheduler. Installing a skill grants neither access nor write permission. Do not use a marketplace connector configured for someone else's instance.

Verify discovery of the four skills and read-only `brain_status`, policy inspection, bounded search, and note inspection. Then use an isolated synthetic vault to check capture, review, and retry behavior before enabling writes against real notes.

Your vault policy determines source access, privacy, allowed actions, and filing. Select any authorized local fallback before submission; never bypass a failed MCP permission, privacy, or revision check through local writes. Keep collector checkpoints and schedules in your private operating documentation. An installed file does not prove a running client reloaded it or a scheduled job executed.

The [agent guide](agent-guide.md) provides the complete protocol and remains available through MCP when a client has no skill support.
