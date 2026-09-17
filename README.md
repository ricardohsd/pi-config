# pi-config

My personal [pi](https://github.com/earendil-works/pi) configuration: a small collection of extensions and skills I use with the pi coding agent.

This repo is meant to be browsed and copied from, not installed wholesale. Pick the pieces you want and copy them into your own `~/.pi/agent` config.

Some ideas and extension patterns were inspired by [amosblomqvist/pi-config](https://github.com/amosblomqvist/pi-config), which is a great reference pi setup.

## Contents

### Extensions

- `extensions/ask-user-question.ts` — adds a tool that lets the agent ask the user a question through an interactive UI, with free-form, single-select, and multi-select answers.
- `extensions/bash-guard/` — intercepts `bash` tool calls and prompts or blocks potentially destructive commands. It has separate behavior for interactive main sessions and non-interactive subagents.
- `extensions/custom-header.ts` — replaces pi's startup header with a custom green Π logo.

### Skills

- `skills/herdr/` — instructions for controlling [Herdr](https://github.com/ricardohsd/herdr), a terminal multiplexer for coding agents, when the user explicitly asks to use Herdr.
- `skills/radioactive/` — a full-cycle 10-phase development lifecycle workflow with discovery, planning, execution, testing, review, fix loops, blueprint updates, and changelog generation. Inspired by [devton/agentic-workflow-blueprint](https://github.com/devton/agentic-workflow-blueprint).
- `skills/mattpocock/wayfinder/` — a strategic orientation workflow for codebase mapping, architectural entry point identification, and problem-space framing before deeper research or implementation.

## Copy an extension

Single-file extension:

```bash
cp extensions/ask-user-question.ts ~/.pi/agent/extensions/
```

Directory extension:

```bash
cp -r extensions/bash-guard ~/.pi/agent/extensions/
```

If the extension has a `package.json`, install its dependencies:

```bash
cd ~/.pi/agent/extensions/bash-guard
npm install
```

Then restart pi or run `/reload`.

## Link skills

Instead of copying skills one by one, symlink this repo's skill directories into your pi config:

```bash
mkdir -p ~/.pi/agent/skills
ln -s /path/to/pi-config-repo/skills/* ~/.pi/agent/skills/
```

Replace `/path/to/pi-config-repo/skills` with the path to this repo's `skills` directory. Then restart pi or run `/reload`.

## Do not clone over your config

Avoid cloning this repository directly into `~/.pi/agent` unless you are starting from a fresh config. If you already use pi, copy individual files or folders so you do not overwrite your own setup.

## Dependencies

Most files are standalone. Extension-local npm dependencies live next to the extension.

Currently, `extensions/bash-guard/` has its own `package.json` and depends on `shell-quote`:

```bash
cd extensions/bash-guard
npm install
```

## Notes

- `bash-guard` only intercepts agent-issued `bash` tool calls. It does not intercept `write`, `edit`, or manual shell commands.
- `bash-guard` allows routine local git commands like `git status`, `git add`, and `git commit`, while still prompting or blocking risky operations.
- The Herdr skill should only be used from inside a Herdr-managed pane and only when the user explicitly asks for Herdr.
