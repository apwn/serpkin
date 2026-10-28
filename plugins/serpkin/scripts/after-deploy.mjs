#!/usr/bin/env node
// PostToolUse hook on Bash (Claude Code plugin): after a push or deploy command in a project linked to
// Serpkin, suggest /serpkin:check once per session. The command text is untrusted and never echoed.
// Opt out with SERPKIN_HOOKS=off (or SERPKIN_HOOKS=session to keep only the session line).
import { access, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hookEnabled } from "./next-line.mjs";

/** git push, and deploys with the common hosting CLIs and package scripts. */
export const DEPLOY =
  /(?:^|[;&|(]\s*|\bnpx\s+(?:--yes\s+|-y\s+)?|\bbunx\s+)(?:git\s+(?:-C\s+\S+\s+)?push\b|vercel(?:\s+(?:deploy|--prod|-p)\b|\s*$|\s*[;&|])|netlify\s+deploy\b|wrangler\s+(?:pages\s+)?deploy\b|fly(?:ctl)?\s+deploy\b|firebase\s+deploy\b|railway\s+up\b|(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?deploy\b)/;
const SESSION = /^[A-Za-z0-9_-]{1,100}$/;

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
      if (raw.length > 1_000_000) done();
    });
    process.stdin.on("end", done);
    process.stdin.on("error", done);
  });
}
const exists = (p) => access(p).then(() => true, () => false);

export async function afterDeploy({ input = {}, env = process.env } = {}) {
  if (!hookEnabled("deploy", env)) return null;
  if (input.tool_name && input.tool_name !== "Bash") return null;
  const command = String(input.tool_input?.command ?? "").slice(0, 10_000);
  if (!DEPLOY.test(command.trim())) return null;
  const dirs = [env.CLAUDE_PROJECT_DIR, typeof input.cwd === "string" ? input.cwd : null].filter(Boolean);
  let linked = false;
  for (const d of dirs) if (await exists(join(d, ".serpkin.json"))) linked = true;
  if (!linked) return null;
  // Once per session.
  const session = SESSION.test(String(input.session_id ?? "")) ? input.session_id : "default";
  const dir = join(env.CLAUDE_PLUGIN_DATA || join(tmpdir(), "serpkin-hooks"), "check-reminded");
  const marker = join(dir, session);
  if (await exists(marker)) return null;
  try {
    await mkdir(dir, { recursive: true, mode: 0o700 });
    await writeFile(marker, String(Date.now()), { mode: 0o600 });
  } catch {}
  return {
    systemMessage: "Serpkin · Once the preview deployment is up, run /serpkin:check <preview-url> to catch SEO regressions before merging.",
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        "Serpkin: the user just pushed or deployed in a repository linked to Serpkin. When a preview URL is available, suggest running /serpkin:check <preview-url> (npx serpkin check) once. Don't run it unasked, and don't repeat this suggestion.",
    },
  };
}

if (process.argv[1]?.endsWith("after-deploy.mjs")) {
  const out = await afterDeploy({ input: await stdin() }).catch(() => null);
  if (out) process.stdout.write(JSON.stringify(out) + "\n");
  process.exit(0);
}
