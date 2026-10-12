# Skills

Reusable instructions for pi coding agents. Each directory containing a `SKILL.md` is a skill.

| Skill | Purpose | Origin / inspiration |
| --- | --- | --- |
| `bro` | Encourages direct, concise collaboration. | Copied from [Cursor Pstack](https://github.com/cursor/plugins/tree/main/pstack/skills/bro). |
| `changelog` | Writes concise changelog entries from approved changes and documentation. | Adapted from [devton/agentic-workflow-blueprint](https://github.com/devton/agentic-workflow-blueprint/tree/main/workflows/changelog). |
| `herdr` | Controls [Herdr](https://github.com/ricardohsd/herdr) when explicitly requested. | Project-specific skill for Herdr. |
| `how` | Explains how a system or behavior works using the repository's `how-explorer` and `how-explainer` Pi subagent profiles. | Adapted from [Cursor Pstack](https://github.com/cursor/plugins/tree/main/pstack/skills/how). |
| `mattpocock/wayfinder` | Maps a codebase and frames the problem before research or implementation. | Inspired by [devton/agentic-workflow-blueprint](https://github.com/devton/agentic-workflow-blueprint). |
| `radioactive` | Runs a 10-phase development workflow from discovery through review and changelogging. | Inspired by [devton/agentic-workflow-blueprint](https://github.com/devton/agentic-workflow-blueprint). |
| `reflect` | Reviews the active Pi session through parallel lenses and proposes durable skill improvements. | Adapted from [Cursor Pstack](https://github.com/cursor/plugins/tree/main/pstack/skills/reflect). |
| `review` | Checks technical documentation against source evidence and returns a pass or fail verdict. | Adapted from [devton/agentic-workflow-blueprint](https://github.com/devton/agentic-workflow-blueprint/tree/main/workflows/review). |
| `technical-writing` | Applies layered structure, style, and clarity rules to technical prose. | Copied from [Cursor Pstack](https://github.com/cursor/plugins/tree/main/pstack/skills/technical-writing). |
| `unslop` | Improves output quality by removing generic or low-signal content. | Copied from [Cursor Pstack](https://github.com/cursor/plugins/tree/main/pstack/skills/unslop). |
| `why` | Investigates and explains rationale using the repository's `why-investigator` and `why-synthesizer` Pi subagent profiles. | Adapted from [Cursor Pstack](https://github.com/cursor/plugins/tree/main/pstack/skills/why). |

The Cursor Pstack skills are retained with their accompanying reference files where applicable. The `how`, `why`, and `reflect` workflows are adapted to the asynchronous tools provided by [pi-interactive-subagents](https://github.com/ricardohsd/pi-interactive-subagents); install the matching profiles from `../agents/` before using them.
