---
description: Check a preview deployment for SEO regressions against production
argument-hint: "<preview-url>"
allowed-tools: Bash(npx -y --registry=https://registry.npmjs.org serpkin@0.2.16 check:*)
---

Run `npx -y --registry=https://registry.npmjs.org serpkin@0.2.16 check $ARGUMENTS` from the repository root. If no URL was given, ask for the preview URL.

Summarize the result: regressions (path, check, production vs preview) and warnings. For each regression, find the code that causes it and propose a fix. Header-level noindex on preview hosts is expected and only a warning.
