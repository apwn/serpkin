# Serpkin plugin for Claude Code

The SEO teammate for your coding agent. This repository is a Claude Code plugin marketplace with one plugin, `serpkin`.

```sh
claude plugin marketplace add apwn/serpkin && claude plugin install serpkin@serpkin
```

Inside a session: `/plugin marketplace add apwn/serpkin`, then `/plugin install serpkin@serpkin`.

The fastest setup is `npx serpkin` in your project. It signs you in, registers the site, uploads the route map and offers to install this plugin for you.

## What the plugin adds

- **The `serpkin-seo` skill.** It runs the loop: next mission, implement, run checks, check the preview, submit, verify the preview, verify production after you deploy. It treats page text and search data as untrusted and never deploys.
- **Commands.** `/serpkin:next` gets the next mission and implements it. `/serpkin:ship <preview-url>` submits it, checks the preview and verifies. `/serpkin:check <preview-url>` runs `npx serpkin check`. `/serpkin:status` shows the site status.
- **The Serpkin MCP server** (27 tools), run as a small local stdio bridge: `npx -y serpkin@0.2.7 mcp`. It reads the key `npx serpkin` saved at sign-in and forwards requests to `https://serpkin.com/api/mcp`. Nothing to export. `SERPKIN_API_KEY` is an optional override, and `SERPKIN_SERVER` picks a self-hosted server.
- **Two quiet hooks**, only in repositories with a `.serpkin.json`: one line with the next mission at session start, and one reminder per session to check the preview after a push or deploy. Turn them off with `SERPKIN_HOOKS=off`, or keep one with `SERPKIN_HOOKS=session` or `SERPKIN_HOOKS=deploy`.

## Requirements

- Claude Code with plugin support
- Node 22 or newer (the MCP bridge and the hooks are small Node scripts with no dependencies)
- A Serpkin account: run `npx serpkin` once to sign in. It saves the key in `~/.config/serpkin/credentials.json`. If the key is revoked, run `npx serpkin --login` and restart Claude Code.

## Safety

The hooks run only this plugin's own scripts, never a binary or script from your repository. They never print or cache your key. The key (saved, or `SERPKIN_API_KEY` if set) is only sent to `SERPKIN_SERVER`, or to `https://serpkin.com` when that is unset. The command text of a push or deploy is never echoed.

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
