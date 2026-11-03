# Licensing and provenance

[LICENSE](LICENSE) applies to Wilson De Torres's original code, documentation, agent skills, favicon, and synthetic demo/test content. It does not relicense dependencies, third-party assets, proprietary software, user notes, or external service content.

| Material | Source and terms |
| --- | --- |
| BoardUI component styles | Adapted from the [free MIT source](https://github.com/BoardUI/boardui) at `ec5c5eb3e29c2441be63b9422cd54f411ef23466`. Shared monochrome tokens are in `src/boardui.css`; existing native components retain their behavior. The full notice is in that stylesheet and [public/THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt). |
| Browser libraries | React, React DOM, scheduler, marked, and lucide-react; full installed license notices are in [public/THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt). Keep them with distributed builds. Lucide includes its upstream ISC/MIT notices. |
| Agent SVGs | Unmodified files from `@lobehub/icons-static-svg@1.102.0`, MIT, copyright LobeHub. [Asset hashes/source](public/agents/sources.json) and [license](public/agents/LOBE-LICENSE). Product marks remain owned by their respective holders; inclusion implies no endorsement. |
| Atkinson Hyperlegible Next 700 | Unmodified font, SIL Open Font License 1.1. [Source/hash](public/fonts/sources.json) and [full OFL notice](public/fonts/OFL.txt). The font is not MIT licensed. |
| Server/build packages | Exact versions are in `package-lock.json`; installed packages retain their own license files. The audited lockfile uses MIT, ISC, and Apache-2.0 declarations. Redistribution must preserve the relevant package notices. |
| Container base | `node:24-bookworm-slim` supplies Node.js and Debian packages under their own licenses. Preserve their notices when distributing an image. The tag can change with security updates. |
| Obsidian Headless | Separately downloaded by the Dockerfile, pinned to `0.0.14`. Its npm package declares `UNLICENSED`; it is proprietary and excluded from this project's MIT grant. [Official installation](https://help.obsidian.md/headless) and [Obsidian terms](https://obsidian.md/terms) govern its use. Pass `--build-arg HEADLESS_VERSION=` to omit it. This repository does not grant permission to redistribute the CLI or a CLI-containing image. |
| External services | Google OAuth, Jev, Obsidian Sync, and optional hosting providers require the operator's own accounts and applicable terms. No credentials or service access are included. |

`src/demo.ts`, the landing animation, and committed JSON fixtures are illustrative examples. They do not include an exported vault, personal booking references, private evaluator datasets, or real production results. Any local evaluation datasets/results belong outside the public repository and need their own disclosure authorization.

The build copies asset and dependency notices into `dist/` and embeds browser-library notices in the portable demo. Distribute the complete build directory, or retain the embedded notices when sharing that demo. If a dependency or asset changes, update its attribution and source/hash alongside it.
