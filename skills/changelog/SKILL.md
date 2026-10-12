---
name: changelog
description: Generate a concise, factual changelog entry from an approved change and its documentation. Use after review passes or when asked to write a changelog entry.
---

# Changelog

Generate a concise changelog entry after documentation or change review is approved.

## Scope

- Applies to finalized changes with a passing review.
- Does not cover publishing or release automation.

## Inputs

Gather these values from the request and conversation:

- Review status
- Documentation or source target
- Change summary
- Changelog destination, when the entry should be written to a file

If the workflow depends on a review and its status is missing or failed, stop and explain what is required. If the user asks only for draft wording, return the draft without modifying files.

## Procedure

1. Confirm that the relevant review passed, when a review is part of the workflow.
2. Read the approved documentation, source diff, and change summary.
3. Extract the end-user or maintainer impact.
4. Draft one concise entry that is understandable without the source diff.
5. Write or update the requested changelog file only when the user requested a file change.
6. Preserve the repository's existing changelog structure and voice.

## Rules

- Keep the entry factual, concise, and user-relevant.
- Exclude internal implementation noise unless it affects users or maintainers.
- Do not claim behavior that the approved evidence does not support.
- Do not publish, tag, or release anything.

## Output

Return the changelog entry and, when applicable, the path that was updated.

## Review gate

- [ ] The relevant review passed, when required.
- [ ] The entry reflects approved evidence.
- [ ] The entry is understandable without the source diff.
- [ ] The entry follows the destination file's format.
- [ ] The entry contains no unsupported claims.

## Related skill

- `../review/SKILL.md`
