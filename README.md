# Serpkin plugin for Claude Code

The SEO teammate for your coding agent. This repository is a Claude Code plugin marketplace with one plugin, `serpkin`.

```sh
claude plugin marketplace add apwn/serpkin-plugin && claude plugin install serpkin@serpkin
```

Inside a session: `/plugin marketplace add apwn/serpkin-plugin`, then `/plugin install serpkin@serpkin`.

The fastest setup is `npx serpkin` in your project. It signs you in, registers the site, uploads the route map and offers to install this plugin for you.

## What the plugin adds

- **The `serpkin-seo` skill.** It runs the loop: next mission, implement, run checks, check the preview, submit, verify the preview, verify production after you deploy. It treats page text and search data as untrusted and never deploys.
- **Commands.** `/serpkin:next` gets the next mission and implements it. `/serpkin:ship <preview-url>` submits it, checks the preview and verifies. `/serpkin:check <preview-url>` runs `npx serpkin check`. `/serpkin:status` shows the site status.
- **The Serpkin MCP server** at `https://serpkin.com/api/mcp` (streamable HTTP, 27 tools). It reads `SERPKIN_API_KEY` from your environment and, for a self-hosted server, `SERPKIN_SERVER`.
- **Two quiet hooks**, only in repositories with a `.serpkin.json`: one line with the next mission at session start, and one reminder per session to check the preview after a push or deploy. Turn them off with `SERPKIN_HOOKS=off`, or keep one with `SERPKIN_HOOKS=session` or `SERPKIN_HOOKS=deploy`.

## Requirements

- Claude Code with plugin support
- Node 22 or newer (the hooks are small Node scripts with no dependencies)
- A Serpkin account and an agent key: run `npx serpkin`, or create a key at https://serpkin.com in Settings, Agent setup. Then `export SERPKIN_API_KEY=...` in your shell profile.

## Safety

The hooks run only this plugin's own scripts, never a binary or script from your repository. They never print or cache your key. `SERPKIN_API_KEY` is only sent to `SERPKIN_SERVER`, or to `https://serpkin.com` when that is unset. The command text of a push or deploy is never echoed.

## Layout

```
.claude-plugin/marketplace.json   marketplace "serpkin", one plugin entry
plugins/serpkin/                  the plugin (manifest, .mcp.json, skill, commands, hooks, scripts)
```

This repository is generated from the Serpkin CLI source (`cli/scripts/export-plugin-repo.mjs`). Open issues here; changes land in the next export.

## Links

- Website: https://serpkin.com
- Free SEO check: https://serpkin.com/tools/seo-check
- Claude Code guide: https://serpkin.com/integrations/claude-code
- CLI on npm: https://www.npmjs.com/package/serpkin
