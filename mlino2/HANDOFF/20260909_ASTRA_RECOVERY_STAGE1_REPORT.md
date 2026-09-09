# Astra recovery stage 1 — panel theme and personal choices

Date: 2026-09-09
Branch: astra/visual-system-local-experience
Base: 285203c (feat: add MLINO future visual system and local discovery)
Workspace: C:\mlino v2
Status at writing: implemented and locally validated; pending independent Claude review. This report does not assert successful Push. Resolve the delivery commit from this report's Git history and verify the remote separately.

## Scope and decisions
- Reconstructed the three explicitly requested handover fixes; did not attempt to reproduce inaccessible commits byte-for-byte.
- Theme now updates document.documentElement.dataset.theme. Existing CSS tokens define dark surfaces, text and borders; native controls use color-scheme. Added readable selected-action colors and corrected light map attribution/filter surfaces affected by inherited theme colors. The setting remains labelled «ظاهر پنل‌ها»; map tiles are not themed.
- Added the personal «مناسب من» toggle (aria-pressed) and collection. Copy explicitly says browser-local, not a public score, and no ranking effect.
- Added immutable toggleExperience transitions. Hiding removes saved/later/liked; adding a personal selection unhides. Restoring does not recreate removed preferences. Parsing old storage makes hidden win over conflicting selections. Viewed history is retained.
- Renamed the task to «جزئیات سه مکان را ببین» and corrected the explanatory copy. Existing unique viewed counting from openDetail is unchanged.
- Added seven regression cases (10 total in the experience suite) covering old storage repair, exclusion transitions, independent unliking, restoration, and immutability.

## Validation actually executed
- npx tsc -b: PASS.
- npm test: PASS, 104/104 tests in 6 files. Suites: clusters 7, directory 15, AR 29, matching 24, local experience 10, LLM 19.
- npm run build: PASS; Vite 7.3.6, 64 modules. Built assets: index-CWTkSUIF.js, index-vjPxw1Y3.css, mock_dataset-Dm56BNQv.js.
- git diff --check: PASS.
- Live browser: served the production dist through Vite preview at http://127.0.0.1:4173. No development-only build was used.
- Theme: measured personal panel background changing rgb(255,255,255) -> rgb(17,26,46), root theme light -> dark. Dark text rgb(240,244,252), muted rgb(170,187,216), progress accent rgb(168,194,255), checkbox color-scheme dark. Returning to light restored white.
- Reload: dark theme persisted; saved and liked place persisted and appeared in both personal collections.
- Mobile 390x844: visually inspected personal and detail panels, selected actions, task text, borders, progress, and checkboxes.
- Hide: chosen place disappeared from saved and liked collections; discovery count changed 10 -> 9 and restore control appeared. Restore returned count to 10 with empty personal collections.
- Browser tests were manual via the connected browser, not a new automated end-to-end suite. Storage-denial rendering and actual camera/GPS behavior were not exercised.

## V1 compatibility evidence and limits
- git diff --exit-code 285203c -- implementation mlino2/02_V1_V2_INTEGRATION_CONTRACT_DRAFT.md mlino2/app/src/directory mlino2/app/src/matching returned no differences.
- main remains 95d7c26d8a8271a5ad55f1964a251d101f7184ef. Only the Astra branch is used.
- No contract/backend/database changes, business fields, API writes, or ranking inputs were introduced. Preferences remain under the existing localStorage key.
- This is evidence of preserving boundaries, NOT an operational V1-to-V2 integration certification. The existing mock directory remains in use.

## Known limitations / not built
- Map tiles failed to load in this environment; the app displayed the honest failure message. Map provider availability is not certified.
- At the default desktop viewport (~998px wide), the personal panel was partially off-screen to the right. Existing desktop CSS sets both horizontal inset values plus fixed width in RTL; those layout declarations were not changed. Independent baseline comparison is requested; this stage does not claim desktop layout is fully verified or repaired.
- «امروز کجا برم؟» and Web Share were mentioned in lost-commit history but are not among the three approved fixes in handover section 4; they were not implemented in this stage.
- No V1 connection, backend, contract change, map dark tiles, public rating, preference-based ranking, or new permissions were added.
- graphify update . completed: 2778 nodes, 3439 edges, 206 communities. Four SQL files were skipped because tree_sitter_sql is absent. Generated graphify-out is local, untracked, and excluded from this V2 delivery; no LLM extraction or API cost was used.

## File checksums
SHA-256 below uses UTF-8 with LF, matching canonical Git blobs. Windows working-copy CRLF may have a different raw hash. SHA256_STAGE1.txt also covers this report and the reusable review prompt; the manifest excludes itself to avoid self-reference.

| File | SHA-256 (Git/LF bytes) |
|---|---|
| mlino2/app/src/App.tsx | c1323ee1448ac71da8e078b49ac387d52e186e228ca9c93c28c3dafdde71b87f |
| mlino2/app/src/experience/ExperiencePanel.tsx | 5fa8dd335bf52e8669124c7aec57afd5d58761dbc0e39f005d84774a8227d5ad |
| mlino2/app/src/experience/useLocalExperience.ts | e5d01cf0f3cb0ea67ea4af83f2282e18e926afcb9be2587f79fbc012fda02307 |
| mlino2/app/src/experience/useLocalExperience.test.ts | 82878a4c52e3fc121229103835d235974c77d68db57b71b334ecd17793931989 |
| mlino2/app/src/index.css | c3209bb81cfaee5e291b70f4b13bf90b741fc31ad6a682a06b787d16165c5fad |

## Review handoff
Use CLAUDE_STAGE_REVIEW_PROMPT.txt for independent review of this stage and subsequent stages. Stop development after delivery until Claude review and the owner's next instruction. No message has been sent to Claude automatically.
