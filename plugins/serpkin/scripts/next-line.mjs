// One line with the next Serpkin mission for the linked project: used by the Claude Code SessionStart hook
// and `serpkin next --oneline`. Dependency-free (the plugin ships without the CLI's lib/).
//
// Fast and quiet by design: a short request timeout, a cache (≤ 1 request per 6 hours per site; failures
// are remembered for 30 minutes), and no output at all when the project isn't linked (.serpkin.json),
// the user isn't signed in, the server isn't trusted, or the network is down.
//
// Same server rules as the CLI (cli/lib/config.mjs): a server named only by .serpkin.json (repository
// content) is used only when it is the hosted default or a server the user already signed in to, and
// SERPKIN_API_KEY is only sent to SERPKIN_SERVER (or the default). The key is never printed or cached.
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

export const DEFAULT_SERVER = "https://serpkin.com";
export const CACHE_MS = 6 * 60 * 60 * 1000;
export const FAILURE_CACHE_MS = 30 * 60 * 1000;
export const TIMEOUT_MS = 2500;
const SITE_ID = /^[A-Za-z0-9_-]{1,80}$/;

const home = (env) => env.HOME || env.USERPROFILE || homedir();
const configDir = (env) => join(env.XDG_CONFIG_HOME || join(home(env), ".config"), "serpkin");
async function json(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return undefined;
  }
}
function origin(s) {
  try {
    const u = new URL(s);
    return ["http:", "https:"].includes(u.protocol) ? u.origin : null;
  } catch {
    return null;
  }
}
/** Plain, single-line text: control, bidi and zero-width characters removed, clipped. */
export function clean(s, max = 120) {
  const t = [...String(s ?? "").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2028\u2029\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim()];
  return t.length > max ? t.slice(0, max - 1).join("") + "…" : t.join("");
}

/** Server and key for this project, or null (silently) when anything is missing or untrusted. */
export async function resolveTarget(cwd, env = process.env) {
  const project = await json(join(cwd, ".serpkin.json"));
  if (!project || typeof project !== "object" || !SITE_ID.test(String(project.site_id ?? ""))) return null;
  const creds = (await json(join(configDir(env), "credentials.json"))) ?? {};
  let server;
  if (env.SERPKIN_SERVER) server = origin(env.SERPKIN_SERVER);
  else if (project.server) {
    server = origin(project.server);
    // Repository content can't pick a new server to send the key to.
    if (server && server !== DEFAULT_SERVER && !creds.servers?.[server]) return null;
  } else server = DEFAULT_SERVER;
  if (!server) return null;
  let key = null;
  if (env.SERPKIN_API_KEY) {
    if (server !== (origin(env.SERPKIN_SERVER || DEFAULT_SERVER) ?? DEFAULT_SERVER)) return null;
    key = env.SERPKIN_API_KEY;
  } else key = creds.servers?.[server]?.api_key ?? null;
  if (!key || typeof key !== "string") return null;
  return { server, site_id: project.site_id, key };
}

const cachePath = (env, server, site) =>
  join(configDir(env), "cache", `next-${createHash("sha256").update(`${server}\n${site}`).digest("hex").slice(0, 24)}.json`);

/**
 * The line, or "" when there is nothing to say. Never throws. `fetchImpl` and `now` are test seams.
 * { line, cached } — `line` is plain text: "Next SEO mission: <title>" (+ how many more are queued).
 */
export async function nextLine({ cwd = process.cwd(), env = process.env, fetchImpl = globalThis.fetch, now = Date.now(), timeoutMs = TIMEOUT_MS, refresh = false } = {}) {
  try {
    const t = await resolveTarget(cwd, env);
    if (!t) return { line: "", cached: false };
    const path = cachePath(env, t.server, t.site_id);
    const c = refresh ? undefined : await json(path);
    if (c && typeof c.at === "number" && now - c.at < (c.failed ? FAILURE_CACHE_MS : CACHE_MS) && now >= c.at)
      return { line: typeof c.line === "string" ? c.line : "", cached: true };
    let line = "",
      failed = false;
    try {
      const r = await fetchImpl(`${t.server}/api/tool`, {
        method: "POST",
        headers: { authorization: `Bearer ${t.key}`, "content-type": "application/json", accept: "application/json", "user-agent": "serpkin-hook" },
        body: JSON.stringify({ tool: "serpkin_next_mission", input: { site_id: t.site_id } }),
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!r.ok) failed = true;
      else {
        const data = await r.json();
        const m = data?.result?.mission;
        const title = clean(m?.title);
        const more = Number(data?.result?.queue_length ?? 0) - 1;
        if (title) line = `Next SEO mission: ${title}${more > 0 ? ` (${more} more queued)` : ""}`;
      }
    } catch {
      failed = true;
    }
    try {
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      const tmp = `${path}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify({ at: now, line, ...(failed ? { failed: true } : {}) }), { mode: 0o600 });
      await rename(tmp, path);
    } catch {}
    return { line, cached: false };
  } catch {
    return { line: "", cached: false };
  }
}

/** SERPKIN_HOOKS=off (or 0/false/no) disables both hooks; =session or =deploy keeps only that one. */
export function hookEnabled(which, env = process.env) {
  const v = String(env.SERPKIN_HOOKS ?? "").trim().toLowerCase();
  if (!v || v === "on" || v === "1" || v === "true") return true;
  if (["off", "0", "false", "no", "none"].includes(v)) return false;
  return v.split(/[\s,]+/).includes(which);
}
