# S1b نسخه‌ی ۰۰۲ — قاعده‌ی حل تعارض فایل Handoff

**تاریخ:** ۱۹ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO

## ۱. وضعیت

کدکس هنگام ادغام main (`7d30d1e`) در شاخه‌ی `codex/test-seed-vanak` متوقف شد:
- تنها تعارض در `mlino2/HANDOFF/HANDOFF_STATE.md` است، چون هر دو شاخه یک ورودی افزودنی جدا در انتهای فایل نوشته‌اند.
- هیچ تعارضی در کد نیست.
- ادغام نیمه‌کاره (MERGE_HEAD) باز مانده است.

رفتار درست بود.

## ۲. قاعده‌ی دائمی نگهبان برای این نوع تعارض

در `mlino2/HANDOFF/HANDOFF_STATE.md`، که فقط افزودنی است، اگر تعارض **فقط** به‌خاطر ورودی‌های افزوده‌شده در انتهای فایل باشد، کدکس بدون پرسیدن دوباره آن را این‌طور حل می‌کند:
- **هر دو ورودی کامل** نگه داشته می‌شوند، به **ترتیب زمانی** ثبت‌شده در خودشان، و ورودی قدیمی‌تر اول می‌آید.
- هیچ خطی از هیچ‌کدام حذف یا ویرایش نمی‌شود.
- نشانه‌های تعارض (`<<<<<<<`، `=======`، `>>>>>>>`) کاملاً برداشته می‌شوند.
- خروجی `git diff` پیش و پس از حل در گزارش ثبت می‌شود.

**این قاعده برای هر فایل دیگری معتبر نیست.** تعارض در هر فایل دیگر، یعنی توقف.

## ۳. دستور کدکس — S1b، نسخه‌ی ۰۰۲

```
INSTRUCTION_ID: CODEX-20260919-S1B-TEST-SEED-ACTIVATE-002
SUPERSEDES: CODEX-20260919-S1B-TEST-SEED-ACTIVATE-001 (items 1-4, report, allowed and forbidden lists unchanged)
TARGET_HANDOFF_ID: HANDOFF-20260919-GUARDIAN-L-MERGED
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-TEST-SEED
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260919_S1B_002_HANDOFF_CONFLICT_RULE.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
STATE: the worktree C:/Users/galexy/mlino code/test-seed-vanak is mid-merge: HEAD 425b7167351a7a0ba341606550cef28cc39d2565,
  MERGE_HEAD 7d30d1ea493388b237af8cd2e588596cba3d7ef7, the only conflict in mlino2/HANDOFF/HANDOFF_STATE.md. Verify
  exactly this state first (git status, MERGE_HEAD, `git diff --name-only --diff-filter=U`); anything else -> STOP.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP.

0 Resolve ONLY mlino2/HANDOFF/HANDOFF_STATE.md per the Guardian rule in section 2 of the pinned record: keep BOTH
  appended entries complete, oldest first by their own timestamps, remove every conflict marker, change nothing
  else. Record the conflicted and the resolved hunks in the report. Then `git add` that file and conclude the merge
  with `git commit --no-edit` (a normal merge commit). NO rebase, NO abort, NO other file edited in the merge.
1-4 Then carry out items 1-4 of CODEX-20260919-S1B-TEST-SEED-ACTIVATE-001 exactly as written (text in
  AI_HANDOFF/CLAUDE_REVIEWS/20260919_CLAUDE_REVIEW_L_MERGE_AND_S1B.md at 3fb0c01).
REPORT, ALLOWED FILES, FORBIDDEN: as in -001.
```

من کلاد هستم
