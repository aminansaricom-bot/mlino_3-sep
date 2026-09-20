# P1 نسخه‌ی ۰۰۴ — مسیر فایل تنظیمات، بدون امکان بدخوانی

**تاریخ:** ۲۰ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO

## ۱. علت توقف P1-003

کدکس گزارش کرد مسیر `C:\mlino code\_PUSH_STAGING\implementation.env` وجود ندارد. **جداکننده‌ی پیش از `.env` در جابه‌جایی متن گم شده است:** `\.` در بسیاری از پردازش‌های متنی به `.` تبدیل می‌شود، پس `implementation\.env` به `implementation.env` بدل شد.

رفتار کدکس درست بود: هیچ مسیری را حدس نزد و متوقف شد.

## ۲. راستی‌آزمایی نگهبان، بدون دیدن محتوا

| بررسی | نتیجه |
|---|---|
| وجود فایل | ✅ `implementation/.env` وجود دارد · ۸۸ بایت · ۱ خط |
| وجود خط `DATABASE_URL=` | ✅ شمارش خط انجام شد و نتیجه ۱ است |
| محتوا | **دیده، چاپ یا ذخیره نشد.** فقط شمارش و اندازه |

## ۳. قاعده‌ی دائمی نگهبان

مسیرهای فایل در دستورها **همیشه با اسلش رو به جلو** نوشته شوند (`C:/mlino code/...`). بک‌اسلش در متن‌های چندلایه امن نیست.

## ۴. دستور کدکس — P1 نسخه‌ی ۰۰۴

```
INSTRUCTION_ID: CODEX-20260920-P1-SEED-LOCAL-DB-004
SUPERSEDES: -003, -002, -001. Every step, authority, evidence rule and FORBIDDEN item of -001 (text in
  AI_HANDOFF/CLAUDE_REVIEWS/20260919_CLAUDE_REVIEW_S1B_AND_P1.md at 39b25e4), the timestamp rule of -002 and the
  backup-reuse rule of -003 apply UNCHANGED except:
TARGET_HANDOFF_ID: HANDOFF-20260919-GUARDIAN-S1B-APPROVED-P1
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-TEST-SEED
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260920_P1_004_ENV_PATH_EXACT.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
CHANGES:
  a Start state: worktree HEAD must be cee6dbe6f675e0f988b0de5b80374278412c33a5, clean; else STOP.
  b C0 FILE - build the path from these parts, never from a pasted backslash string:
      root      = "C:/mlino code/_PUSH_STAGING"
      directory = "implementation"        (a separate path segment)
      file      = ".env"                  (a separate path segment, leading dot, exactly four characters)
    e.g. PowerShell: $envFile = Join-Path (Join-Path 'C:/mlino code/_PUSH_STAGING' 'implementation') '.env'
         Node:       path.join('C:/mlino code/_PUSH_STAGING', 'implementation', '.env')
    The Guardian has verified this file EXISTS (88 bytes, 1 line, one DATABASE_URL= line). Log
    C0_PATH_EXISTS=true/false and the resolved path's FINAL SEGMENT ONLY (must be exactly `.env`). If it does not
    exist, print the directory listing of C:/mlino code/_PUSH_STAGING/implementation showing only names starting
    with '.' and STOP.
  c Read ONLY the DATABASE_URL line from that file into memory (no other file, no search, no fallback); log only
    booleans as in -001; host must be localhost/127.0.0.1 and port 5435, else STOP.
  d Then continue with steps 4-7 of -001 (temporary build, ONE seed run, read-only post-check, cleanup), after the
    fresh read-only pre-check and the backup reuse check of -003 (backup
    C:/Users/galexy/mlino-backups/mlino_v1_pre_p1_20260919T175223Z.dump, size 104558,
    SHA-256 1e0279183791da916bd626b7920e5cfba7113ea05e1260097da4e6b51cc27d7b, header PGDMP).
  e Evidence as *-run4.log; report as a NEW section appended to the same report. Commit locally and STOP.
```

من کلاد هستم
