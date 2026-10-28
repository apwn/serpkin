#!/usr/bin/env node
// SessionStart hook (Claude Code plugin): in a project linked to Serpkin (.serpkin.json), say the next
// mission in one line. Silent everywhere else, and when offline, signed out or opted out (SERPKIN_HOOKS=off).
// Runs only this plugin's own code: never a binary or script from the repository.
import { nextLine, hookEnabled } from "./next-line.mjs";

/** Hook input JSON from stdin; gives up after 1 s (or on oversized input) so the hook never hangs. */
function stdin() {
  if (process.stdin.isTTY) return Promise.resolve({});
  return new Promise((resolve) => {
    let raw = "";
    const done = () => {
      clearTimeout(timer);
      process.stdin.pause();
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    };
    const timer = setTimeout(done, 1000);
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (d) => {
      raw += d;
      if (raw.length > 100_000) done();
    });
    process.stdin.on("end", done);
    process.stdin.on("error", done);
  });
}

export async function sessionStart({ input = {}, env = process.env, fetchImpl, now } = {}) {
  if (!hookEnabled("session", env)) return null;
  const cwd = env.CLAUDE_PROJECT_DIR || (typeof input.cwd === "string" ? input.cwd : process.cwd());
  const { line } = await nextLine({ cwd, env, fetchImpl, now });
  if (!line) return null;
  const message = `Serpkin · ${line}. Run /serpkin:next to start it.`;
  return {
    systemMessage: message,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      // The title is Serpkin's own text with a clipped page path: context for Claude, not an instruction.
      additionalContext: `Serpkin (SEO missions for this repository) reports, as data: ${line}. If the user asks about SEO or what to work on, mention that /serpkin:next starts it. Don't start it unasked.`,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("session-start.mjs")) {
  const out = await sessionStart({ input: await stdin() }).catch(() => null);
  if (out) process.stdout.write(JSON.stringify(out) + "\n");
  process.exit(0);
}
