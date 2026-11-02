# Hosted writer activation — November 2, 2026

> This document records the earlier deployed workflow. The new assessment/commit implementation and pending activation steps are tracked in [release validation](assess-commit-validation.md).

**Active for eligible personal same-session captures.** The deployed MCP has `AUTO_ACCEPT=new,update`. A new note and existing-note updates applied through Jev, exact retries returned the same operations, and the saved Markdown matched local Obsidian files. Promotion remains disabled. Existing collectors, checkpoints, hooks and schedules retain their prior routes. Immediate-parent navigation and log/index bookkeeping remain explicitly local for this cutover.

## Why Jev held the updates

The original evaluator assessed a complete long note as one candidate. It confused preserved dated checkpoints with the newer state and assigned possible context loss even when the old Markdown was an exact prefix. Related context also diluted support for a new note: the corrected lesson scored 0.98 against its evidence alone but 0.72 with the production shortlist.

The shipped v23 adapter separates source support from novelty and historical compatibility for appends and new notes with related context. Exact prefix preservation ending at a newline is checked in code. Novelty distinguishes new information, an already-recorded memory, and uncertainty; uncertainty is not treated as a confidently identified duplicate. Related notes still participate in duplicate/conflict checks. Source support, novelty and compatibility must each reach 0.95; conflict must remain at most 0.05. Replacement checks, privacy eligibility, revision protection and journaled writes remain intact. Related-note ranking uses parsed body text so frontmatter cannot crowd out the subject.

This improves the failure mode but does not eliminate conservative holds. A shortened development lesson also made an incorrect exclusivity claim about zero removed-context scores; it was not applied. The supported original lesson was subsequently accepted through a fresh normal review after v23 deployed. No proposal was forced through, no threshold was lowered, and no held knowledge capture was retried locally.

## Deployment and rollback record

| Checkpoint | Evidence |
| --- | --- |
| Four-skill deployment | `d50b773272ad4f0868b5ec1d8ef1bf519f7d4d3e`; Vercel `dpl_HSiruJxr7E7HEB7jhEL7a9nars6L` Ready; Render `dep-dbk2f63bc2fs73e1k910` live. |
| First activation trial | `new,update` briefly enabled; two deployment append proposals held and the target note stayed unchanged. Exact retry returned the same held operation. |
| First-trial rollback | Only `AUTO_ACCEPT` restored to empty; Render `dep-dbk2hsg473hc73c4r9i0` live at `2026-11-02T06:09:27.566849Z`; authenticated MCP subsequently confirmed empty acceptance and successful sync. |
| v22 deployment | `8fd1a1301adfcac3e6651ea1ae8157ac55e9452b`; Vercel `dpl_CzLehN33KG66FUC4xB6how96u3ia` Ready; Render `dep-dbk2uk6417fc73bgoam0` live. |
| Writer enabled | Only `AUTO_ACCEPT` merged to `new,update`; Render `dep-dbk2v5ec6qcc73dckn0g` live at `2026-11-02T06:37:52.389506Z`. |
| v23 and concurrent UI changes | Writer commit `eeaa9feb2475ce095869027261da03b66bf05c58` merged with the UI work as `f3a8f1ce6ba92d1f59133c6fdfc18fe74a7addd8`; Vercel `dpl_GaipVr3HFBhieEygrGDwuJd8cbVj` Ready; Render `dep-dbk35eivcj2c73fj5520` live at `2026-11-02T06:51:26.499702Z`. |

A private same-disk backup at `/data/backups/pre-writer-2026-11-02` contains the pre-trial vault, Headless configuration and SQLite online backups. Source/copy file hashes were stable; both databases passed `integrity_check`; permissions are private. This predates the applied captures and is not an independent disaster-recovery copy or a full restore test.

To disable acceptance, restore only `AUTO_ACCEPT` to empty, deploy and verify authenticated `brain_status`. That does not undo applied notes or erase proposal history. Do not restore the old vault over newer notes merely to change acceptance settings. Explicit connection review is a separate mutation capability.

## Applied writes and recovery checks

| Operation | Result |
| --- | --- |
| `cf49eccd-0694-45e5-b52f-c92513dcda80` | Existing project acceptance-state update, v22: support 0.99, conflict 0.02. Exact retry returned the same applied operation. Hosted/local revision `d4261f7afa975d2532229b84246b96bd3a39342cbc6ec172c4744f2e3a730444` matched before the final milestone append. |
| `713a6f08-69f0-40d5-ab0f-7d1e7a753648` | New preservation lesson, v23: support 0.98, novelty 0.99, conflict 0.01. Exact retry/readback passed. Hosted/local revision `c7670020319a6e4bce7eac6a4817dddb57d0e756c4da54278f2b3a682ef3e1ed` matched. |
| `984edf9c-b844-4ee3-9dd9-20e0a693baf7` | Final project activation milestone, v23: support 0.97, novelty 1.00, conflict 0.02. Exact retry/readback passed. Hosted/local revision `2a11eba9c4681b01876e4500d6f7233c60b194d12ef67c7520354f037f3924d1` matched. |

The existing project parent already linked its note. The new lesson links its Learnings parent and the project; native Obsidian updated the immediate Learnings parent through the route selected before submission. Hosted parent/lesson/profile readback matched local hashes and links resolved. **Parent-index mutation through MCP was not verified.** Standalone clients without the required local bookkeeping cannot claim a complete new-note filing through this owner route.

Five remaining trial proposals were closed with matching applied-operation references and reasons distinguishing the superseding capture from their unwritten original text. The two reviewed originals closed their own work items. `list_work(kind: proposal)` then returned no items. No unrelated Inbox/review work or source acknowledgement was advanced. Private exact retry payloads, operation results and local instruction backups remain outside Git under `/Users/wilson/.local/state/brain-companion/writer-activation-20261102/`.

## Owner rollout and validation

Canonical owner routing, root instructions, Capture stage, Sources/cadence, relevant agent setup and installed Codex/Claude guidance were updated and read back. All four portable skill directories still match their canonical source; their MCP-first procedure needed no owner-specific changes. Existing collectors and maintenance methods remain selected, so no scheduler changes were required.

The merged tree passed **89 tests**, TypeScript and the production build. Authenticated MCP reads/writes worked; the public page and worker `/healthz` returned 200, while anonymous `/api/brain` and `/mcp` returned 401. Vercel does not route public `/healthz`. QMD keyword/embedding refresh completed; the native graph reported 226 notes, 1,301 edges, no stale paths and no unresolved links. Existing template orphans and unused embedding chunks were not cleaned up.

Model evaluation is documented in [jev-features.md](jev-features.md). The final focused ten-case check had seven exact labels, with no unsafe acceptance and three conservative mismatches; its strict exact-label gate did not pass. The real lesson and final live writes passed their unchanged thresholds. The 50-case unchanged-path cached replay passed but does not test the new context branch. Following Wilson's explicit extension, cumulative evaluation/live-verification usage reached **2,050 / 2,050**; no further paid evaluation was run.

Remaining limits: conservative false holds; local parent/log/index bookkeeping; collector/checkpoint cutover; other clients' OAuth/reload and unattended execution; off-disk recovery and interrupted-sync recovery. These were not implied by enabling `new,update`.
