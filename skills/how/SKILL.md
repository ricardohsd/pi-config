---
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation."
disable-model-invocation: true
---

# How

Explore the codebase to answer "how does X work?" questions. Produce architectural explanations at the level of a senior engineer onboarding onto a subsystem, enough to build a working mental model, not so much that it reads like annotated source code.

Use Pi's `subagent` tool for all delegation. The named agent profile controls its model and tool access; do not pass a `model` override unless the user explicitly requests one.

Subagent calls are asynchronous. Give every spawn a unique, descriptive `name`, dispatch independent calls in the same turn, and then stop or continue unrelated work. Results arrive automatically as steer messages. Never poll with `subagents_list`, shell loops, sleeps, pane inspection, or session files. Before synthesis, ensure that results have arrived from every expected explorer name. Use `subagents_list` only when you need to confirm that the required profiles are installed.

## Step 1. Assess Complexity

If the scope is ambiguous, state your interpretation and explore. The user can redirect.

- **Simple** (a single module, a small utility, a narrow question such as "how does function X work"): no explorers. One explainer explores and explains in a single pass. Go to Step 2b.
- **Complex** (a subsystem spanning multiple files or services, a cross-cutting feature, a full architectural overview): spawn parallel explorers first, then hand off to the explainer. Go to Step 2a.

When in doubt, take the simple path.

## Step 2a. Explore (complex questions only)

Decompose the question into 2 to 4 exploration angles, each a distinct slice of the subsystem. Spawn all explorers in the same turn so they run concurrently:

- `agent`: `how-explorer`
- `name`: a unique descriptive handle such as `how-entrypoints`, `how-data-flow`, or `how-boundaries`
- `task`: the complete prompt from `references/explorer-prompt.md` with the question and exploration angle filled in

Do not pass `readonly`; read-only access is enforced by the `how-explorer` profile. After dispatching the explorers, end the current turn rather than polling. Continue to Step 3 only after every named result has been delivered automatically.

## Step 2b. Direct Explain (simple questions)

Spawn one Pi subagent that explores and explains in one pass:

- `agent`: `how-explainer`
- `name`: a unique handle such as `how-direct-explainer`
- `task`: the complete prompt from `references/explainer-prompt.md` without the explorer-findings section

Do not pass `readonly`; read-only access is enforced by the `how-explainer` profile. End the current turn and continue to Step 4 only after its result is delivered automatically.

## Step 3. Synthesize (complex questions only)

Once every named explorer has returned, spawn one Pi subagent to synthesize their findings into one explanation:

- `agent`: `how-explainer`
- `name`: a unique handle such as `how-synthesizer`
- `task`: the complete prompt from `references/explainer-prompt.md` with every explorer's findings filled in

End the current turn and continue only after its result is delivered automatically. Do not reuse a prior run's name unless you intentionally want `subagent_message` to resume that subagent's existing session.

## Step 4. Present

Present the explainer's output to the user. Light edits for clarity or context from the conversation are fine. Do not substantially rewrite it.

## Output Format

The explanation uses the sections defined in `references/explainer-prompt.md`, dropping any that do not apply: Overview, Key Concepts, How It Works, Where Things Live, Gotchas.
