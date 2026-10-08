import path from "node:path";
import os from "node:os";
import { parse as shellParse } from "shell-quote";

export type Severity = "high" | "medium";
export type Risk = { severity: Severity; reasons: string[] };

type OpToken = { op: string; pattern?: string; [key: string]: unknown };
type Token = string | OpToken;
type CommandPart = { args: string[]; hasGlob: boolean };

const SHELLS = new Set(["sh", "bash", "dash", "zsh", "fish"]);
const GIT_OPTIONS_WITH_VALUE = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--super-prefix", "--config-env"]);

function isOpToken(token: Token): token is OpToken {
	return typeof token === "object" && token !== null && "op" in token;
}

function executableName(value: string): string {
	return path.basename(value);
}

function split(tokens: Token[], operators: string[]): Token[][] {
	const parts: Token[][] = [];
	let current: Token[] = [];
	for (const token of tokens) {
		if (isOpToken(token) && operators.includes(token.op)) {
			if (current.length) parts.push(current);
			current = [];
		} else {
			current.push(token);
		}
	}
	if (current.length) parts.push(current);
	return parts;
}

function commandPart(tokens: Token[]): CommandPart {
	const args: string[] = [];
	let hasGlob = false;
	for (const token of tokens) {
		if (typeof token === "string") args.push(token);
		else if (token.op === "glob") {
			hasGlob = true;
			if (typeof token.pattern === "string") args.push(token.pattern);
		}
	}
	return { args, hasGlob };
}

function unwrapCommand(args: string[]): string[] {
	let current = [...args];
	while (current.length) {
		while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(current[0] || "")) current.shift();
		const cmd = executableName(current[0]);
		if (cmd === "command" || cmd === "builtin" || cmd === "nohup") {
			current = current.slice(1);
			continue;
		}
		if (cmd === "env") {
			current = current.slice(1);
			while (current.length) {
				const arg = current[0];
				if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(arg)) {
					current.shift();
					continue;
				}
				if (arg === "-u" || arg === "--unset" || arg === "-C" || arg === "--chdir" || arg === "-S" || arg === "--split-string") {
					current = current.slice(2);
					continue;
				}
				if (arg.startsWith("-")) {
					current.shift();
					continue;
				}
				break;
			}
			continue;
		}
		break;
	}
	return current;
}

function gitInvocation(args: string[]): { subcommand?: string; args: string[] } {
	let index = 1;
	while (index < args.length) {
		const arg = args[index];
		if (arg === "--") {
			index++;
			break;
		}
		if (!arg.startsWith("-")) break;
		if (GIT_OPTIONS_WITH_VALUE.has(arg)) index += 2;
		else if ([...GIT_OPTIONS_WITH_VALUE].some((option) => arg.startsWith(`${option}=`))) index++;
		else index++;
	}
	return { subcommand: args[index], args: args.slice(index + 1) };
}

function hasShortFlag(args: string[], flag: string): boolean {
	return args.some((arg) => arg === `-${flag}` || (/^-[^-]/.test(arg) && arg.slice(1).includes(flag)));
}

function isTemporaryAbsolute(target: string): boolean {
	const resolved = path.resolve(target);
	const roots = [os.tmpdir(), "/tmp", "/private/tmp", "/var/tmp"].map((root) => path.resolve(root));
	return roots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
}

function sensitiveTarget(target: string): boolean {
	const clean = target.replace(/^['"]|['"]$/g, "");
	if (clean === "/dev/null") return false;
	if (clean === "." || clean === ".." || clean === "~" || clean === "/") return true;
	if (clean.startsWith("../") || clean.includes("/../")) return true;
	if (/(^|\/)\.git(?:\/|$)/.test(clean)) return true;
	if (/^(?:~|\$HOME)\/(?:\.ssh|\.gnupg|\.aws|\.config)(?:\/|$)/.test(clean)) return true;
	if (clean.startsWith("/dev/")) return true;
	return path.isAbsolute(clean) && !isTemporaryAbsolute(clean);
}

function deletionRisk(cmd: string, rest: string[], hasGlob: boolean): Risk | null {
	const options: string[] = [];
	const targets: string[] = [];
	let afterOptions = false;
	for (const arg of rest) {
		if (!afterOptions && arg === "--") {
			afterOptions = true;
		} else if (!afterOptions && arg.startsWith("-")) {
			options.push(arg);
		} else {
			targets.push(arg);
		}
	}
	const recursive = options.includes("--recursive") || hasShortFlag(options, "r") || hasShortFlag(options, "R");
	const reasons: string[] = [];
	if (recursive) reasons.push("recursive deletion");
	if (hasGlob) reasons.push("glob deletion may affect multiple files");
	if (targets.length > 1) reasons.push("deletes multiple targets");
	if (targets.some(sensitiveTarget)) reasons.push("deletes a protected or non-temporary absolute path");
	if (!recursive && !hasGlob && targets.length <= 1 && !targets.some(sensitiveTarget)) return null;
	return { severity: recursive || targets.some(sensitiveTarget) ? "high" : "medium", reasons: reasons.length ? reasons : [`${cmd} deletion`] };
}

function gitRisk(args: string[]): Risk | null {
	const { subcommand, args: rest } = gitInvocation(args);
	if (!subcommand) return null;
	if (subcommand === "rm") return { severity: "medium", reasons: ["git rm deletes tracked files"] };
	if (subcommand === "clean" && (rest.includes("--force") || hasShortFlag(rest, "f"))) {
		return { severity: "high", reasons: ["git clean can permanently delete untracked files"] };
	}
	if (subcommand === "reset" && rest.includes("--hard")) {
		return { severity: "high", reasons: ["git reset --hard discards working-tree changes"] };
	}
	const checkoutPositionals = rest.filter((arg) => !arg.startsWith("-"));
	if (
		subcommand === "checkout" &&
		(rest.includes("--") ||
			rest.includes("--force") ||
			hasShortFlag(rest, "f") ||
			checkoutPositionals[0] === "." ||
			checkoutPositionals[0] === ".." ||
			checkoutPositionals.length >= 2)
	) {
		return { severity: "medium", reasons: ["git checkout can overwrite working-tree changes"] };
	}
	if (subcommand === "switch" && (rest.includes("--force") || rest.includes("--discard-changes") || hasShortFlag(rest, "f"))) {
		return { severity: "medium", reasons: ["forced git switch can discard working-tree changes"] };
	}
	if (subcommand === "restore" && (!rest.includes("--staged") || rest.includes("--worktree"))) {
		return { severity: "medium", reasons: ["git restore can overwrite working-tree changes"] };
	}
	if (subcommand === "push" && (rest.includes("--force") || rest.includes("--force-with-lease") || hasShortFlag(rest, "f"))) {
		return { severity: "high", reasons: ["forced git push can rewrite remote history"] };
	}
	if (subcommand === "branch" && (rest.includes("-D") || rest.includes("--delete-force"))) {
		return { severity: "medium", reasons: ["git branch -D force-deletes a branch"] };
	}
	if (subcommand === "stash" && (rest[0] === "drop" || rest[0] === "clear")) {
		return { severity: "medium", reasons: [`git stash ${rest[0]} deletes recovery data`] };
	}
	if (subcommand === "worktree" && rest[0] === "remove") {
		return { severity: "medium", reasons: ["git worktree remove deletes a working tree"] };
	}
	if (subcommand === "push" && rest.includes("--delete")) {
		return { severity: "medium", reasons: ["git push --delete removes a remote reference"] };
	}
	if (subcommand === "reflog" && rest.includes("expire")) {
		return { severity: "high", reasons: ["git reflog expire can remove recovery history"] };
	}
	if (subcommand === "gc" && rest.some((arg) => arg === "--prune" || arg.startsWith("--prune="))) {
		return { severity: "high", reasons: ["git gc --prune can permanently delete objects"] };
	}
	return null;
}

function segmentRisk(tokens: Token[]): Risk | null {
	const part = commandPart(tokens);
	const args = unwrapCommand(part.args);
	if (!args.length) return null;
	const cmd = executableName(args[0]);
	const rest = args.slice(1);

	if (cmd === "git") return gitRisk(args);
	if (cmd === "rm" || cmd === "rmdir" || cmd === "unlink") return deletionRisk(cmd, rest, part.hasGlob);
	if (cmd === "sudo") return { severity: "high", reasons: ["sudo uses elevated privileges"] };
	if (cmd === "find" && rest.includes("-delete")) return { severity: "high", reasons: ["find -delete can perform bulk deletion"] };
	if (cmd === "truncate") return { severity: "medium", reasons: ["truncate changes or erases file contents"] };
	if (cmd === "dd" && rest.some((arg) => arg === "of" || arg.startsWith("of="))) return { severity: "high", reasons: ["dd with an output can overwrite data"] };
	if (/^(?:mkfs|newfs_)/.test(cmd) || ["wipefs", "parted", "fdisk", "gdisk", "sgdisk", "cryptsetup", "pvcreate", "vgcreate", "lvcreate", "zpool", "gpt", "asr"].includes(cmd)) {
		return { severity: "high", reasons: [`${cmd} performs disk or volume management`] };
	}
	if (cmd === "diskutil" && rest.some((arg) => /^(?:erase|zeroDisk|secureErase|reformat)/i.test(arg))) return { severity: "high", reasons: ["destructive diskutil operation"] };
	if ((cmd === "chmod" || cmd === "chown") && (rest.includes("-R") || rest.includes("--recursive"))) return { severity: "medium", reasons: [`recursive ${cmd}`] };
	if ((cmd === "mv" || cmd === "cp") && (rest.includes("-f") || rest.includes("--force"))) return { severity: "medium", reasons: [`${cmd} --force can overwrite files`] };
	if (cmd === "sed" && (rest.includes("-i") || rest.some((arg) => /^-i.+/.test(arg)) || rest.includes("--in-place"))) return { severity: "medium", reasons: ["sed edits files in place"] };
	if (cmd === "perl" && (rest.includes("-pi") || (rest.includes("-p") && rest.includes("-i")))) return { severity: "medium", reasons: ["perl edits files in place"] };
	if (["kill", "pkill", "killall"].includes(cmd)) return { severity: rest.includes("-9") ? "high" : "medium", reasons: [`${cmd} terminates processes`] };
	if (["shutdown", "reboot", "halt", "poweroff"].includes(cmd)) return { severity: "high", reasons: [`${cmd} changes system power state`] };
	if (cmd === "systemctl" && rest.some((arg) => arg === "stop" || arg === "disable")) return { severity: "medium", reasons: ["systemctl can disrupt a service"] };
	if (cmd === "kubectl" && rest[0] === "delete") return { severity: "high", reasons: ["kubectl delete removes resources"] };
	if (cmd === "terraform" && rest[0] === "destroy") return { severity: "high", reasons: ["terraform destroy tears down infrastructure"] };
	if (cmd === "aws" && rest[0] === "s3" && rest[1] === "rm" && rest.includes("--recursive")) return { severity: "high", reasons: ["recursive S3 deletion"] };
	if (cmd === "gcloud" && rest.includes("delete")) return { severity: "high", reasons: ["gcloud delete removes cloud resources"] };
	return null;
}

function redirectionRisks(tokens: Token[]): Risk[] {
	const risks: Risk[] = [];
	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index];
		if (!isOpToken(token) || ![">", ">>", "2>", "2>>"].includes(token.op)) continue;
		const target = tokens[index + 1];
		if (typeof target === "string" && sensitiveTarget(target)) {
			risks.push({ severity: "high", reasons: [`output redirection targets protected path: ${target}`] });
		}
	}
	return risks;
}

function remotePipeRisk(pipeline: Token[][]): Risk | null {
	for (let index = 0; index < pipeline.length - 1; index++) {
		const left = unwrapCommand(commandPart(pipeline[index]).args);
		const right = unwrapCommand(commandPart(pipeline[index + 1]).args);
		if (["curl", "wget"].includes(executableName(left[0] || "")) && SHELLS.has(executableName(right[0] || ""))) {
			return { severity: "high", reasons: ["downloaded content is piped directly to a shell"] };
		}
	}
	return null;
}

function parseCommand(command: string): Token[] | null {
	try {
		return shellParse(command) as Token[];
	} catch {
		return null;
	}
}

function findGitRiskForMode(command: string, headless: boolean): string | null {
	const tokens = parseCommand(command);
	if (!tokens) return null;
	for (const sequence of split(tokens, ["&&", "||", ";", "&"])) {
		for (const segment of split(sequence, ["|"])) {
			const args = unwrapCommand(commandPart(segment).args);
			if (executableName(args[0] || "") !== "git") continue;
			const invocation = gitInvocation(args);
			const sub = invocation.subcommand;
			const rest = invocation.args;
			if (headless && (sub === "pull" || sub === "push")) return `git ${sub} is reserved for the main session`;
			if (!headless && sub === "push" && (rest.includes("--force") || rest.includes("--force-with-lease") || hasShortFlag(rest, "f"))) return "forced git push rewrites remote history";
			if (sub === "reset" && rest.includes("--hard")) return "git reset --hard discards changes";
			if (sub === "clean" && (rest.includes("--force") || hasShortFlag(rest, "f"))) return "git clean can delete untracked files";
			if (sub === "reflog" && rest.includes("expire")) return "git reflog expire removes recovery history";
			if (sub === "gc" && rest.some((arg) => arg === "--prune" || arg.startsWith("--prune="))) return "git gc --prune can delete objects";
		}
	}
	return null;
}

export function findHeadlessGitRisk(command: string): string | null {
	return findGitRiskForMode(command, true);
}

export function findDisabledGitRisk(command: string): string | null {
	return findGitRiskForMode(command, false);
}

export function analyzeBashCommand(command: string): Risk | null {
	const tokens = parseCommand(command);
	if (!tokens) return { severity: "medium", reasons: ["unable to parse shell command safely"] };

	const risks: Risk[] = [...redirectionRisks(tokens)];
	for (const sequence of split(tokens, ["&&", "||", ";", "&"])) {
		const pipeline = split(sequence, ["|"]);
		const pipeRisk = remotePipeRisk(pipeline);
		if (pipeRisk) risks.push(pipeRisk);
		for (const segment of pipeline) {
			const risk = segmentRisk(segment);
			if (risk) risks.push(risk);
		}
	}
	if (!risks.length) return null;
	return {
		severity: risks.some((risk) => risk.severity === "high") ? "high" : "medium",
		reasons: [...new Set(risks.flatMap((risk) => risk.reasons))],
	};
}
