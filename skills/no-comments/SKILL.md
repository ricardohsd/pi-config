---
name: no-comments
description: "Use when asked to audit, remove, or justify code comments and suppressions. Delegates an independent review, applies accepted findings, and offers enforceable replacements for valid constraints."
disable-model-invocation: true
---

# No comments

Use Pi's `subagent` tool to obtain a fresh, independent comment review. Act only on accepted findings.

## Scope

Use the files or diff supplied by the caller. Otherwise, inspect the current working-tree diff against the base branch, defaulting to `main`.

## Steps

1. Spawn a Pi subagent for the independent review:
   - `agent`: `worker`
   - `name`: a unique descriptive name such as `comment-sicko-review`
   - `task`: Give it the scope and ask it to report, without editing files, every comment or suppression that should be removed or replaced. Do not restate this skill's rules.

   Subagent calls are asynchronous. Do not poll; wait for its result to arrive automatically.

2. Inspect the report and any diff. Reject application-code edits, scope escapes, exception-protected deletions, misstated `MUST KILL` reasons, and findings that treat intentionally retained code as guilty. Findings about surprising behavior in our code remain actionable; do not restore those comments. Keep a comment only with proof that it documents something we cannot change. Audit the scope for missed lint and TypeScript suppressions. Correctness- or safety-related suppressions remain actionable `MUST KILL`s. Restore deletions only for an exact exception with scoped proof. Before accepting a thin `IMPORTANT` or `do not remove` finding, invoke the `how` or `why` skill for the referenced symbol. If removal is ambiguous, do not restore it. If keeping it is refuted or remains ambiguous, delete it. If you reject a report, rerun one independent review with the rejection reason. If a second report is also rejected, report the issue as open and fail the skill.

3. Fix trivial accepted findings directly: delete dead paths, remove unnecessary parameters, or use the real API. If a fix needs design shape, invoke the `how` skill once for the accepted findings and surrounding code. Stop after the sketch; implement in the next step.

4. Implement the smallest in-scope root-cause fix. Remove every named workaround. If the root cause is out of scope, make the smallest safe in-scope fix and report the remaining work as open. Do not widen scope or add symptom guards.

5. Constraint comments include `do not remove`, `do not change wording`, or `talk to X before changing`. Keep a constraint comment only when it describes something that cannot be changed. Offer the cheapest in-scope type check, runtime validation, test, or CI lint that would enforce it. Wait for interactive approval before encoding it. In unattended or evaluation work, require caller pre-approval. If approved, encode the constraint and then delete the comment. Otherwise, delete it, report the constraint as open, and sketch the out-of-scope work.

6. Report the deletion count, restored comments, review reruns, any design sketch, fixes, encoding offers, applied encodings, unenforced constraints, and other open work.
