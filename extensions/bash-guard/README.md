# bash-guard (pi extension)

Intercepts agent-issued `bash` tool calls and applies different protection depending on whether
the session is interactive (main session) or non-interactive (spawned subagent).

## Modes

Behaviour is determined at registration time via the `PI_SUBAGENT_DEPTH` environment variable,
which pi-subagents injects into every spawned process.

### Main session (`PI_SUBAGENT_DEPTH` = 0 or unset) — interactive prompt

- Heuristically detects destructive/questionable commands via shell-aware parsing
- Allows routine Git commands by default, including `status`, `diff`, `log`, `show`, `fetch`,
  normal `push`, `switch`, `branch`, and invocations using global options such as `git -C repo status`
- Prompts only for explicitly destructive Git forms: `git rm`, `git reset --hard`, forced
  `git clean`, path-overwriting `checkout`/`restore`, force-push, `branch -D`, `reflog expire`,
  and `gc --prune`
- Prompts for destructive disk/volume tooling: disk-erasing `diskutil` operations, `mkfs*`,
  `newfs_*`, `wipefs`, `parted`, `fdisk`, `gdisk/sgdisk`, `cryptsetup`,
  `pvcreate/vgcreate/lvcreate`, and `zpool`; read-only listing and ordinary disk-image creation pass
- Hard-blocks `apt` and `apt-get` in every mode (system package mutation)
- Allows simple single-target deletion such as `rm file.tmp`, `rm -f build.log`, and deletion
  beneath temporary directories; prompts for recursive deletion, globs, multiple targets, path
  traversal, protected paths, and non-temporary absolute paths
- Prompts for: `sudo`, `find -delete`, `dd` outputs, `truncate`, `sed -i`, `perl -pi`,
  `chmod/chown -R`, `mv/cp --force`, process termination, system power/service disruption,
  destructive disk tools, and infrastructure deletion
- Allows ordinary input/output redirection; prompts when output targets devices, `.git`, parent
  paths, sensitive home configuration, or non-temporary absolute paths
- Allows benign pipelines such as `find ... | sort` and detects remote execution only when
  `curl`/`wget` feeds a shell directly; `bash script.sh | grep warning` is allowed
- Shows a 3-option dialog: **Run once** / **Allow for session** / **Abort**
- If aborted, the tool call is blocked and the model receives a clear reason
- Remembers recently aborted commands for 60 s to prevent retry loops

### Subagent (`PI_SUBAGENT_DEPTH` ≥ 1) — headless hard-block

Spawned subagents have no UI (stdin is `/dev/null`), so prompting is impossible. Instead,
a focused set of catastrophic/unrecoverable operations is hard-blocked with no user interaction:

| Pattern | Reason |
|---|---|
| `rm -r` / `-rf` / `-Rf` | Recursive deletion |
| `apt`, `apt-get` | System package management |
| `sudo` | Elevated privileges |
| `curl\|sh`, `wget\|sh` | Pipe to shell (remote code execution) |
| `mkfs*`, `newfs_*` | Filesystem formatting |
| `wipefs` | Disk signature wipe |
| `diskutil erase/zeroDisk/secureErase/reformat` | Destructive disk operation |
| `dd of=/dev/…` | Raw disk write |
| `parted`, `fdisk`, `gdisk`, `sgdisk` | Partition table management |
| `cryptsetup` | Disk encryption management |
| `zpool` | ZFS pool management |
| `shutdown`, `reboot`, `halt`, `poweroff` | System power operation |
| `terraform destroy` | Infrastructure teardown |
| `kubectl delete` | Kubernetes resource deletion |
| `aws s3 rm --recursive` | Bulk S3 deletion |
| `git pull` | Main-session operation |
| `git push` | Main-session operation |
| `git reset --hard` | Discard all uncommitted changes |
| `git clean -f` | Delete untracked files |
| `git reflog expire` | Remove recovery history |
| `git gc --prune` | Prune unreachable objects |

All other commands (including `git status`, `git add`, `git commit`, and other routine git operations) pass through unaffected.

## Install

Auto-discovered from `~/.pi/agent/extensions/bash-guard/`. Run `/reload` in pi.

## Test

```bash
npm test
```

The regression suite contains representative safe and dangerous Git, deletion, redirection, and
pipeline commands. Add every reported false positive to this table before changing the classifier.

## Notes

- Scope: `bash` tool calls only (`write`/`edit` and user `!` commands are not intercepted).
- `--bash-guard-auto-allow`: main-session flag that allows flagged commands when there is no UI
  (e.g. running pi non-interactively). Has no effect in subagent sessions.
