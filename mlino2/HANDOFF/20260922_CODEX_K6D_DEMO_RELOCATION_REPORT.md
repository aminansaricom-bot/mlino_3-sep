# K6D Demo Relocation — Codex Execution Report

Status: IMPLEMENTED LOCALLY; AWAITING GUARDIAN REVIEW
Instruction: CODEX-20260922-K6D-DEMO-RELOCATION-001
Branch: codex/v2-demo-mode
Base: 8d83839dc649bd440e5a394a87b67a6f70a4d21c
Code commit: 67211da

## 1. Task executed
Added a build-gated, UI-only relocation of signed demo organizations (`test-demo-` IDs). Their east/north offsets from the 35.7575,51.4098 anchor are applied at the first successful geolocation fix. Later fixes do not move the cluster until the user selects «انتقال دستهٔ نمایشی به اینجا». Before a fix, demo records are hidden. A persistent «حالت نمایشی — دادهٔ آزمایشی» banner identifies active demo mode. Turning demo mode off clears its target and hides demo records; it can be re-enabled explicitly.

## 2. Source and preconditions
Pinned approval: `8601e0ed28b0142ddac1b77f723276c9cbf633ec:AI_HANDOFF/CLAUDE_REVIEWS/20260922_OWNER_APPROVAL_K6D_DEMO_MODE.md`. GW2-P: commit type `commit`; ancestor of origin/main, exit 0; `git show` SHA-256 `73d55bf2bb8be5049be40b4ae357faf050bb7035fc2dc8bf8c39017c30d4db59`. `origin/codex/v2-intent-flow-foundation` was exactly `8d83839dc649bd440e5a394a87b67a6f70a4d21c`. New branch/worktree created from it. No fetch or other network access.

## 3. Files changed
- `mlino2/app/src/demo/demoRelocation.ts`: pure point parsing, relocation and presentation gating.
- `mlino2/app/src/demo/demoRelocation.test.ts`: seven focused tests.
- `mlino2/app/src/publicExport/RealPublicApp.tsx`: UI wiring, first-fix anchor, re-anchor/disable controls and banner.
- `mlino2/app/src/vite-env.d.ts`: two VITE demo variables.
- `mlino2/app/src/index.css`: banner and controls styling.
- This report and an append-only handoff entry.

## 4. Files not changed
No signed artifact, business or catalog acceptance logic, public-export mapper, V1 file, nginx/Docker/compose, package or lockfile, data file, main, or existing V2 branch changed. No `.env`, token or key file was opened. No push.

## 5. Validation commands
Using the existing ignored `node_modules` junction, offline in `mlino2/app`:

| Flag | `npm run build` | `npm test` |
| --- | --- | --- |
| unset | PASS; TypeScript and Vite, 93 modules, 3.14 s | PASS; 24 files, 295 tests |
| `VITE_DEMO_RELOCATE=1` | PASS; TypeScript and Vite, 93 modules, 3.39 s | PASS; 24 files, 295 tests |

Both rows were rerun after the final source edit. `git diff --check` passed. The seven new tests cover flag-off identity/no relocation call, record gating/object identity, offsets at Tehran and distant targets, invalid anchor parsing, no-fix hiding, one-time anchoring plus explicit re-anchor, and enabled-only banner text. Other V2 tests remained green.

## 6. Behavior and limits
The relocation runs after `toPublicUiRecords` and before all UI filtering, so the map, list, proximity/distance calculations, detail selection and AR vitrine share the same presentation coordinates. The catalog remains keyed by organization ID. The demo flag is accepted only as the literal string `1`; an invalid anchor fails closed by hiding demo records. No real phone geolocation or visual layout check was performed.

## 7. Commit
Code commit `67211da`. The documentation/handoff commit follows this report. All work remains local to `codex/v2-demo-mode`.

## 8. Remaining risks
A real-device check is still needed for geolocation permissions, the banner/control layout at small viewport sizes and AR positioning. There is no persistence of the chosen target, intentionally using the permitted in-memory alternative. Browser refresh requires a new successful fix.

## 9. Open questions
No architecture decision was changed. Guardian can confirm the in-memory anchor choice and real-device presentation.

## 10. Recommended next step
Guardian review of this local branch and a phone UI check. Do not activate the mode in deployment or begin K6b from this report; those steps retain their separate gates.
