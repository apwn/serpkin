---
description: Submit the current Serpkin mission, check the preview and verify it
argument-hint: "<preview-url> [mission-id]"
---

Use the serpkin-seo skill to ship the mission you just implemented (mission id from the arguments, otherwise the one in progress from `serpkin_next_mission`). Arguments: $ARGUMENTS

1. Run `npx serpkin check <preview-url>`. If it exits 1, fix the regressions, push and run it again.
2. Call `serpkin_submit_result` with the PR URL, the preview URL and a short summary of the tests you ran.
3. Call `serpkin_verify_mission`: `environment: "preview"` with the preview_url for technical missions, `environment: "evidence"` for content and research missions.
4. Report the verification status and tier. Remind me to call production verification after I deploy. Don't merge or deploy.

If no preview URL was given, ask for it.
