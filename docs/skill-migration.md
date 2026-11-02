# Focused Brain skills

The `brain-workflows` package contains four independent Agent Skills:

| Skill | Purpose |
|---|---|
| `brain-recall` | Retrieve and cite prior context without mutations. |
| `brain-capture` | Preserve useful sourced knowledge and verify the actual outcome. |
| `brain-review` | Resolve or defer authorized pending work with evidence and claims. |
| `brain-maintain` | Check health read-only, or perform specifically authorized maintenance. |

## Installation

Connect the owner's deployed HTTPS MCP endpoint through the chosen client's OAuth flow first. Skills reuse that connection; the package contains no endpoint, credentials, MCP registration or hooks. Tool prefixes are discovered at runtime. Resources and prompts are optional: each skill describes canonical-policy discovery through `inspect`.

For standalone installation, copy the four `skills/brain-{recall,capture,review,maintain}` directories to the client's supported skills directory. Back up and reconcile an existing `brain-capture` before replacement. Keep owner-specific paths and local routes in owner guidance, not in distributed skill files. Restart or refresh client discovery and verify each client separately.

For a bundled Claude Code installation or test, the plugin root is this repository's **`skills/` directory**:

```sh
claude plugin validate --strict skills
claude --plugin-dir ./skills plugin details brain-workflows
```

The minimal `.claude-plugin/plugin.json` declares four explicit sibling directories. Claude's default scan is additive, so the absence of a nested `skills/skills/` directory is intentional. The legacy `skills/brain-harness` remains for existing callers but is not a declared component. Do not install that broad skill alongside the replacements.

OpenAI documents Claude-compatible manifests as supported; this package uses that format to share the same files. Standalone local installation is the initial Codex adoption path. Marketplace registration/publication and automatic connection setup are separate work. See [Claude manifest path rules](https://code.claude.com/docs/en/plugins-reference#path-rules) and [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins).

## Owner configuration during migration

The skill defaults to MCP. An owner can explicitly retain an existing local capture/review route before submitting anything. That procedure must already define source scope, privacy, revisions, navigation, logging and checkpoints. It is not an automatic fallback after a rejected, held or uncertain MCP action.

The current deployment has verified `new,update` acceptance enabled for eligible personal same-session captures; promotion remains disabled. Internal or otherwise assessment-excluded notes cannot apply through the existing Jev-gated path, and protected operational files cannot be written through MCP. Preserve those existing local workflows until equivalent hosted behavior is designed and verified. Never weaken privacy metadata to make a proposal pass.

Read-only health checks do not claim/finish work, write logs or request persisted suggestions. Explicit link acceptance is separate from `autoAccept`; an empty list is not a universal mutation lock. Existing local Smart Connections work keeps its local method and budget.

## Adoption record — November 2, 2026

- Four source skills and minimal plugin manifest authored; Claude inline discovery returned exactly four skills, no hooks or MCP registrations.
- Existing MCP source instructions and served guide aligned and deployed in commit `d50b773`. Tool schemas and enforcement are unchanged.
- Independent simulated workflow check and isolated MCP tests completed; see [validation](skill-validation.md).
- All four skills are installed in local Codex and Claude skill directories and mirrored under the vault's `_System/Skills/`. Every source and installed file matched byte-for-byte. Existing `brain-capture` was backed up and replaced, with no competing definition left in those roots.
- Native Codex `skills/list` returned all four enabled skills, with no Brain errors, for both the project and vault contexts. A nonpersisted Claude CLI session also listed all four standalone skills and completed with zero tool calls. Claude inline bundle discovery passed. These checks do not establish Claude's MCP OAuth or live mutation readiness.
- Canonical owner routing, four stage contracts, search guidance, agent setup and local Codex/Claude global guidance now refer to the focused skills and an owner-only migration profile. Ordinary local writers and maintenance methods remain explicitly selected.
- The three existing local Codex automation prompts were updated through the supported automation tool. Saved prompt readback matched exactly; comparison of every other field confirmed that only prompts and update timestamps changed. No jobs were created or run as tests.
- Private rollback copies of affected local files and original automation definitions are outside the repository and vault. Remote Claude desktop accomplishments, Grok review and Dots enrichment prompts remain pending independent verification; their local setup notes explicitly preserve current behavior.
- QMD keyword/embedding refresh completed. The native-derived graph reported no stale paths and no unresolved links. Hosted MCP readback matched the local capture skill and owner migration profile by content hash; this is representative sync evidence, not full cross-device convergence.
- Final independent branch review found no material or minor findings. All 75 repository tests passed, alongside type checking and build. Commit `d50b773` was pushed to `main` and verified Ready/live on Vercel and Render.

## Verified same-session writer cutover

Wilson requested resolving the held proposals and finishing activation. v23 is deployed, a new note and existing-note updates applied, exact retries returned the same operations, and saved files matched local Obsidian hashes. See [activation evidence and limits](writer-activation.md).

The owner profile now selects MCP for eligible personal same-session capture. New-note parent navigation and local log/index work retain the existing authorized native route, selected before submission. This does not establish parent-index mutation through MCP. Existing collectors, assessment-excluded captures and disconnected clients keep their preselected local routes; no held MCP proposal may be retried locally. Collector checkpoint/acknowledgement acceptance remains a separate cutover.

Pending service work includes an explicit strategy for assessment-excluded captures; changing a skill cannot supply that capability. Remote Claude/Grok/Dots scheduler adoption requires their actual supported configuration interfaces. Preserve schedules, source access, limits and notification intent; never infer a successful migration from synced Markdown alone.
