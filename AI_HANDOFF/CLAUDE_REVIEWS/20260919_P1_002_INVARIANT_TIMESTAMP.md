# P1 نسخه‌ی ۰۰۲ — ساخت زمان پشتیبان مستقل از تقویم ویندوز

**تاریخ:** ۱۹ سپتامبر ۲۰۲۶
**ثبت‌کننده:** Claude Opus 5 — نگهبان معماری MLINO

## ۱. توقف P1-001 و راستی‌آزمایی نگهبان

کدکس در B2 متوقف شد. تنظیمات فرهنگی ویندوز مالک، تقویم **هجری شمسی** است، پس برچسب زمانی نام فایل پشتیبان با تقویم شمسی ساخته شد و با الگوی اجباری UTC به شکل `YYYYMMDDTHHMMSSZ` جور درنیامد.

**نگهبان بررسی کرد:**
- commit توقف `b4e851c` فقط شواهد و گزارش دارد و نشتی در آن نیست.
- در `C:\Users\galexy\mlino-backups` هیچ فایل `pre_p1` نیمه‌کاره‌ای نیست.
- `pg_dump`، C0 و seed هیچ‌کدام اجرا نشده‌اند و **دیتابیس بی‌تغییر است.**
- شاخه با lease پیشروی از `228a95f` به `b4e851c` منتشر شد.

بررسی پیش‌کار موفق بوده است: ۸ migration، ۱۳ trigger، ۳۰ CHECK و صفر سازمان آزمایشی.

## ۲. قاعده‌ی دائمی نگهبان

هر برچسب زمانی که در نام فایل یا در شواهد می‌آید، **همیشه** با تقویم میلادی و `InvariantCulture` ساخته می‌شود و هرگز با تنظیمات محلی ویندوز. نمونه در PowerShell:
`[DateTime]::UtcNow.ToString("yyyyMMdd'T'HHmmss'Z'", [Globalization.CultureInfo]::InvariantCulture)`
در Node: `new Date().toISOString()`.

## ۳. دستور کدکس — P1 نسخه‌ی ۰۰۲

```
INSTRUCTION_ID: CODEX-20260919-P1-SEED-LOCAL-DB-002
SUPERSEDES: CODEX-20260919-P1-SEED-LOCAL-DB-001 - every step, authority, evidence rule and FORBIDDEN item of -001
  (text in AI_HANDOFF/CLAUDE_REVIEWS/20260919_CLAUDE_REVIEW_S1B_AND_P1.md at 39b25e4) applies UNCHANGED except:
TARGET_HANDOFF_ID: HANDOFF-20260919-GUARDIAN-S1B-APPROVED-P1
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-TEST-SEED
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260919_P1_002_INVARIANT_TIMESTAMP.md (PINNED_COMMIT/SHA256 relayed)
MODEL: SOL.
CHANGES FROM -001:
  a Start state: the worktree HEAD must be b4e851c86f8d339382ba0ac95f83715069d57a51 (your stop commit), clean;
    else STOP. Append new evidence under implementation/validation/p1/ (do not delete the -001 stop evidence).
  b Redo step 1 (the READ-ONLY PRE-CHECK) freshly; test-vanak organizations must still be 0.
  c Every timestamp (the backup file name and evidence) MUST be produced with the Gregorian calendar and
    InvariantCulture, e.g. PowerShell
    [DateTime]::UtcNow.ToString("yyyyMMdd'T'HHmmss'Z'", [Globalization.CultureInfo]::InvariantCulture)
    or Node new Date().toISOString(); then still validate it against ^\d{8}T\d{6}Z$ before use. Never use the
    Windows current culture for any date.
  d Then continue with steps 2-7 of -001 exactly as written (backup B1-B6, C0, temporary build, ONE seed run,
    read-only post-check, cleanup), same evidence, report as a NEW section appended to
    AI_HANDOFF/CODEX_REPORTS/20260919_CODEX_P1_SEED_LOCAL_DB_REPORT.md. Commit locally and STOP.
```

من کلاد هستم
