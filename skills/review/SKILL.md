---
name: review
description: Review technical documentation against source evidence and return a deterministic PASS or FAIL with concrete fixes. Use when checking docs for correctness, clarity, operational safety, or release readiness.
---

# Review

Review documentation quality and correctness with explicit pass or fail criteria.

## Scope

- Applies to technical documentation and documentation produced as part of a change workflow.
- Does not cover implementing code fixes outside the documentation scope.

## Inputs

Gather these values from the request and conversation:

- Documentation target
- Source evidence, such as a diff, implementation files, tests, or command output
- Maximum review attempts, defaulting to 3 when this review is part of an iterative workflow
- Current attempt, defaulting to 1

Ask for missing evidence only when it cannot be discovered from the repository or conversation.

## Procedure

1. Read the documentation and the source evidence.
2. Verify every behavioral, structural, command, path, and configuration claim against the evidence.
3. Check the document's structure, clarity, audience fit, and required sections.
4. For infrastructure, networking, infrastructure-as-code, or operating-system documentation, verify:
   - pre-change assumptions;
   - post-change validation commands and expected output;
   - operational safety notes;
   - rollback steps and residual risks.
5. Return one verdict:
   - `PASS`: no blocking issue remains;
   - `FAIL`: list each blocking issue with an exact correction.
6. Set the next action:
   - `run_changelog` after `PASS` when a changelog step was requested;
   - `rerun_document` after `FAIL` when another attempt remains;
   - `manual_intervention` after `FAIL` when the attempt limit is reached.

## Rules

- Base every finding on evidence.
- Give a concrete correction for every failure.
- Keep feedback concise and unambiguous.
- Do not modify code while performing the review unless the user separately asks for fixes.
- Never report `PASS` when a material claim could not be verified. Report the evidence gap instead.

## Output

Use this structure:

```text
reviewStatus: PASS | FAIL
reviewFindings:
- <finding and correction, or "None">
nextAction: run_changelog | rerun_document | manual_intervention | none
```

## Review gate

- [ ] Every documentation claim was checked against source evidence.
- [ ] Every `FAIL` finding includes correction guidance.
- [ ] The verdict maps directly to the next action.
- [ ] The configured attempt limit is enforced.
