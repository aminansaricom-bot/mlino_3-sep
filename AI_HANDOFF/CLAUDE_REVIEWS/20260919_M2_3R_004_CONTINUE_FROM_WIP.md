# ادامه‌ی دور استرا از روی کار نیمه‌تمام — نسخه‌ی ۰۰۴

**تاریخ:** ۱۹ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO

## ۱. وضعیت گزارش‌شده و راستی‌آزمایی نگهبان

کدکس نسخه‌ی ۰۰۲ را شروع کرده بود. با رسیدن نسخه‌ی ۰۰۳ متوقف شد، اصلاح خودش در `signing.ts` را برگرداند و هیچ commit، merge یا push نکرد. پاک کردن خودکار فایل‌های commit‌نشده را هم بررسی ایمنی خودش مسدود کرد، که کار درستی بود.

**آنچه نگهبان در worktreeها دید:**

| worktree | HEAD | کار نیمه‌تمام |
|---|---|---|
| `public-export-distribution` | `b4ac4ce` | تغییر در `distribute.ts` (+۲۹، −۴) · آزمون‌های تازه `hardening.spec.ts`، `parity.spec.ts` و پوشه‌ی `test/public-export/e2e/` · `signing.ts` فقط به‌خاطر **پایان خط** «تغییریافته» دیده می‌شود. با `--ignore-cr-at-eol` تفاوت محتوایی ندارد |
| `v2-public-export-route` | `a809c2f` | `e2eFixture.test.ts` و پوشه‌ی `fixtures/e2e/`، هر دو تازه |

**تصمیم نگهبان:** این کار نیمه‌تمام **دور ریخته نمی‌شود.** کدکس از روی آن ادامه می‌دهد. تنها کار لازم، برگرداندن `signing.ts` است که فقط پایان خطش فرق دارد. این کار هیچ محتوایی را از بین نمی‌برد، ولی بدون آن ادغام main ممکن نیست. نگهبان این برگرداندن را **صریحاً مجاز** می‌کند.

## ۲. دستور کدکس — نسخه‌ی ۰۰۴

```
INSTRUCTION_ID: CODEX-20260919-M2-3R-ASTRA-JOINT-REVIEW-004
SUPERSEDES: -003 (and -002, -001). Items 1-5, allowed files and forbidden list of -001 still apply; item 0 below
  replaces item 0 of -002/-003.
TARGET_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-SIGNATURE-FIX-MERGED
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-PUBLIC-EXPORT-OPERATIONS
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260919_M2_3R_004_CONTINUE_FROM_WIP.md (PINNED_COMMIT/SHA256 relayed)
MODEL: ASTRA.
SCOPE: the same two branches and worktrees; HEADs must be V1 b4ac4ce9ed82ef40ffb4da8816019d0d98e73763 and
  V2 a809c2f7255cbe8ea2208d0da983a8d8b6b95e4a (else STOP). KEEP your uncommitted -002 work in both worktrees and
  continue from it; do NOT delete it. No push, rebase, amend or force.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP.

0 V1 worktree, in this exact order:
  a Verify implementation/public-export/signing.ts differs from HEAD ONLY by line endings:
    `git diff --ignore-cr-at-eol -- implementation/public-export/signing.ts` must print nothing (record it).
    If it prints anything, STOP and report.
  b The Guardian explicitly authorizes restoring that single file: `git restore -- implementation/public-export/signing.ts`.
    Restore NOTHING else; keep distribute.ts changes and all untracked test files.
  c Merge main: `git merge --no-ff 4c8866cb6d176ee0a299b66fd61350319ed2c82e` (normal merge commit, NO rebase). Your
    remaining uncommitted changes do not overlap the merged files (signing.ts, signing-canonical.spec.ts); if git
    still refuses or conflicts, STOP and report without discarding anything.
  d Do NOT edit signing.ts. Re-run the M2-3R-F1 diagnostic and record that V1 now REJECTS the non-canonical
    spelling exactly like V2.
1-5 Review your own uncommitted -002 work critically (it was written before the main fix; drop any part that
  duplicated the signature fix), then complete items 1-5 of -001 exactly as written (text in
  AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_M2_3B_AND_ASTRA_ROUND.md at d741a84): the end-to-end fixture
  (agreement on the canonical case AND joint rejection of the non-canonical case), timing G10 / O2, Windows rename
  G11 / O3, the adversarial list including the 2,000,000-byte size cap O1, and THREE-run validation on both branches.
REPORT: append a new section to AI_HANDOFF/CODEX_REPORTS/20260918_CODEX_M2_3R_ASTRA_REVIEW_REPORT.md on EACH branch
  (the item-0 outputs; findings table with F1 = fixed on main 4c8866c; fixture sha256; timing decision;
  rename-lock result; run totals with skips and reasons; LF sha256; GW2/GW2-P outputs). Append only to
  mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES: those of -001 (plus the merge commit of main into the V1 branch).
FORBIDDEN: everything forbidden in -001, INCLUDING any content change to signing.ts; deleting any work other than
  the single authorized restore in 0b.
```

**شناسه‌ی Handoff عمداً عوض نشد** تا دستور موازی S1 کهنه نشود.

من کلاد هستم
