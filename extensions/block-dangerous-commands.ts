/**
 * Block Dangerous Commands Extension
 *
 * Blocks or requires confirmation for dangerous system commands:
 * - sudo, apt-get, apt (always blocked)
 * - rm -rf and variants (strict or confirm mode)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Commands that are always blocked - each can be a string or regex pattern
const BLOCKED_COMMANDS: readonly (string | RegExp)[] = [
  /\bsudo\b/,
  /\bapt-get\b/,
  /\bapt\b(?!-)/,  // Match 'apt' but not 'apt-get' or 'apt-list' etc.
];

// rm -rf protection mode: "strict" to always block, "confirm" to ask each time
const RM_RF_MODE = "confirm"; // "strict" | "confirm"

// Patterns that match dangerous rm -rf usage
const RM_RF_PATTERNS = [
  /\brm\s+(-[a-zA-Z]*rf?\S*)/i,         // rm -rf, rm -fr, rm --recursive -f, etc.
  /\brm\s+(-[a-zA-Z]*f?\S*r\S*)/i,      // rm -fr, etc.
  /\brm\s+-[a-zA-Z]*\s+-[a-zA-Z]*/i,    // rm -r -f separated flags
];

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.notify("System commands blocked: sudo, apt-get, apt", "warning");
    const rmMsg = RM_RF_MODE === "strict" ? "rm -rf commands are blocked" : "rm -rf requires confirmation";
    ctx.ui.notify(`rm -rf protection: ${rmMsg}`, "info");
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return undefined;

    const command = event.input.command as string;
    if (!command) return undefined;

    // Check blocked system commands first
    const matchedBlocked = BLOCKED_COMMANDS.find((pattern) =>
      typeof pattern === "string"
        ? command.includes(pattern)
        : pattern.test(command)
    );

    if (matchedBlocked) {
      const blockedCmd = typeof matchedBlocked === "string" ? matchedBlocked : matchedBlocked.source;
      return {
        block: true,
        reason: `Blocked command: '${blockedCmd.trim()}' is not allowed`,
      };
    }

    // Check for rm -rf patterns
    const isRmRf = RM_RF_PATTERNS.some((pattern) => pattern.test(command));

    if (!isRmRf) return undefined;

    // Strict mode: always block
    if (RM_RF_MODE === "strict") {
      ctx.ui.notify("rm -rf command blocked", "error");
      return { block: true, reason: "rm -rf commands are not allowed" };
    }

    // Confirm mode: ask the user
    if (!ctx.hasUI) {
      ctx.ui.notify("rm -rf blocked (no UI for confirmation)", "error");
      return { block: true, reason: "rm -rf blocked: no interactive terminal" };
    }

    const confirmed = await ctx.ui.confirm(
      "⚠️ Dangerous command detected",
      `Are you sure you want to run:\n\n  ${command}\n\nThis could permanently delete files!`,
    );

    if (!confirmed) {
      ctx.ui.notify("Command cancelled", "info");
      return { block: true, reason: "User cancelled rm -rf command" };
    }

    return undefined; // Allow the command to proceed
  });
}
