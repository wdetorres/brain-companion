# Brain skill validation — November 2, 2026

## Procedure checks

An independent agent received the four skill descriptions and twelve synthetic user/tool scenarios, without the design or expected answers. It selected the appropriate workflow and followed the procedures for:

- Tool-only recall with historical/current conflicting evidence.
- A held capture with an unacknowledged collector token.
- An uncertain write retry preserving its original payload despite a newer revision.
- An expired review claim with changed evidence.
- A read-only health check with open work and a broken link.
- Unavailable required local Smart Connections.
- A preselected authorized local capture of internal context.
- An MCP privacy hold without a route change.
- An unrelated CSS request that should activate no Brain skill.
- An inaccessible original source during review.
- Evaluator-reported duplication without verified existing-note evidence.
- A single authorized link among several suggestions.

The review found one ambiguity between selecting source-verifiable work and recording a deferral when evidence is inaccessible. The review skill now explicitly permits an authorized worker to claim solely to record that deferral; reporting-only runs remain nonmutating. External assessment remains conditional on owner authorization, including when a user asks for one link.

These were simulated selection/procedure checks, not live client actions or a statistical trigger benchmark.

## Actual checks

- `claude plugin validate --strict skills`: valid manifest, zero warnings after adding package attribution.
- `claude --plugin-dir ./skills plugin details brain-workflows`: exactly four intended skills; zero agents, hooks, MCP registrations and LSP servers. This is component discovery, not an OAuth or mutation test.
- TypeScript check and production build passed.
- 23 isolated tests passed across MCP integration, memory review, work claims, promotion and memory features. They use temporary vaults and stubbed evaluators; no production notes or live Jev requests.
- Live connected MCP status/search/inspect/list-work reads succeeded before implementation. Capture acceptance remained empty; no production mutation was used as a smoke test.

The bundled Python skill validator could not start with the host interpreter because PyYAML is absent; its offline dependency cache also lacked PyYAML. An assert-based check using the already-installed JavaScript YAML parser passed for all four skills: names/descriptions, reference existence, absence of owner paths/names, UI metadata and declared manifest paths. No dependency was added.

Native Codex `skills/list` discovered all four enabled skills without Brain errors in project and vault contexts. Source and installed files matched in Codex, Claude and the vault. Existing automation prompts were read back exactly and all other fields except update timestamps were unchanged. See [the migration record](skill-migration.md). Live Claude session/OAuth, remote scheduler execution, production write cutover and another device's convergence are not established by these checks.
