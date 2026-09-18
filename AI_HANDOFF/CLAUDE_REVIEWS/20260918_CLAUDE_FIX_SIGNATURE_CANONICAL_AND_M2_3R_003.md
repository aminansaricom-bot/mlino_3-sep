# اصلاح و ادغام بررسی امضا (M2-3R-F1) به‌دست نگهبان، و صدور نسخه‌ی ۰۰۳ دور استرا

**تاریخ:** ۱۸ سپتامبر ۲۰۲۶
**مجری:** Claude Opus 5 — نگهبان معماری MLINO

## ۱. دستور مالک

> «موضوع امضا رو اصلاح و ادغام کن»

## ۲. اصلاح

**فایل:** `implementation/public-export/signing.ts`، فقط `verifyEnvelope`

**تغییر:** یک تابع کمکی تازه به نام `canonicalSignatureBytes`. مقدار امضا فقط وقتی پذیرفته می‌شود که:
- دقیقاً ۸۶ نویسه از الفبای base64url باشد؛
- به **دقیقاً ۶۴ بایت** باز شود؛
- دوباره عیناً به **همان متن** برگردد.

**بدون تغییر ماند:** `signEnvelope`، `signedBytes`، جداکننده‌ی دامنه و قرارداد. فایل‌هایی که درست ساخته شده‌اند مثل قبل پذیرفته می‌شوند.

**آزمون تازه:** `implementation/test/public-export/signing-canonical.spec.ts`، بدون دیتابیس.

| آزمون | پیش از اصلاح | پس از اصلاح |
|---|---|---|
| امضای استاندارد هنوز پذیرفته می‌شود | ✅ | ✅ |
| **نوشتار غیراستاندارد همان امضا رد می‌شود** | ❌ **شکست**، یعنی همان ایراد | ✅ |
| طول ۶۳ و ۶۵ بایت، `==`، نویسه‌ی `+` و مقدار خالی رد می‌شوند | ✅ | ✅ |

**اجرای پس از اصلاح** زیر حساب مالک، روی کپی جدا: **۵ فایل، ۱۴ از ۱۴**. این شامل آزمون‌های رابط گاوصندوق و رفت‌وبرگشت واقعی DPAPI است.
- type-check: ۰ خطا در فایل‌های مربوط.
- `public-export.spec.ts` دیتابیس آزمون روی درگاه 5499 می‌خواهد و اجرا نشد. آن آزمون‌ها امضا را فقط از `signEnvelope` می‌سازند که همیشه نوشتار استاندارد دارد، پس از این تغییر اثر نمی‌پذیرند.

## ۳. ادغام

| مورد | مقدار |
|---|---|
| commit اصلاح | `1d038b3` روی `384d80e` |
| **merge در main** | **`4c8866cb6d176ee0a299b66fd61350319ed2c82e`**، با `--no-ff` و lease روی `384d80e` |
| دامنه | ۲ فایل (+۵۸، −۳) |

## ۴. دستور کدکس — دور استرا، نسخه‌ی ۰۰۳

نسخه‌ی ۰۰۲ از کدکس می‌خواست همین اصلاح را روی شاخه‌ی خودش انجام دهد. اکنون که اصلاح در main است، این کار باعث تداخل می‌شود. پس نسخه‌ی ۰۰۳ جایگزین آن است.

```
INSTRUCTION_ID: CODEX-20260918-M2-3R-ASTRA-JOINT-REVIEW-003
SUPERSEDES: CODEX-20260918-M2-3R-ASTRA-JOINT-REVIEW-002 (and -001). Items 1-5, allowed files and forbidden list of
  -001 apply UNCHANGED; item 0 of -002 is REPLACED by item 0 below. If you already started -002, STOP and report.
TARGET_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-SIGNATURE-FIX-MERGED
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-PUBLIC-EXPORT-OPERATIONS
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_FIX_SIGNATURE_CANONICAL_AND_M2_3R_003.md (PINNED_COMMIT/SHA256 relayed)
MODEL: ASTRA.
SCOPE: the same two branches, on origin at
  V1 codex/public-export-distribution @ b4ac4ce9ed82ef40ffb4da8816019d0d98e73763
  V2 codex/v2-public-export-route     @ a809c2f7255cbe8ea2208d0da983a8d8b6b95e4a
  Each local HEAD must equal the SHA above (else STOP). LOCAL commits only; no push, rebase, amend or force.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP.

0 SIGNATURE FIX IS ALREADY ON MAIN (merge 4c8866cb6d176ee0a299b66fd61350319ed2c82e): verifyEnvelope now accepts only
  canonical unpadded base64url of exactly 64 bytes; test implementation/test/public-export/signing-canonical.spec.ts.
  On the V1 branch, FIRST merge origin/main at 4c8866c into codex/public-export-distribution with a normal merge
  commit (git merge --no-ff 4c8866c; NO rebase). If the merge conflicts, STOP and report. Do NOT edit signing.ts.
  After the merge, re-run the M2-3R-F1 diagnostic: V1 must now REJECT the non-canonical spelling exactly like V2;
  record the output.
1-5 Complete items 1-5 of -001 exactly as written (text in AI_HANDOFF/CLAUDE_REVIEWS/
  20260918_CLAUDE_REVIEW_M2_3B_AND_ASTRA_ROUND.md at d741a84): the cross-component end-to-end fixture (it must
  show agreement on the canonical case AND joint rejection of the non-canonical case), timing G10 / O2, Windows
  rename G11 / O3, the adversarial list including the 2,000,000-byte size cap O1, and THREE-run validation on
  both branches.
REPORT: append a new section to AI_HANDOFF/CODEX_REPORTS/20260918_CODEX_M2_3R_ASTRA_REVIEW_REPORT.md on EACH branch
  (findings table with F1 = fixed on main 4c8866c; fixture sha256; timing decision; rename-lock result; run totals
  with skips and reasons; LF sha256; GW2/GW2-P outputs). Append only to mlino2/HANDOFF/HANDOFF_STATE.md.
  Commit locally and STOP.
ALLOWED FILES: those of -001 (plus the merge commit of main into the V1 branch).
FORBIDDEN: everything forbidden in -001, INCLUDING signing.ts (the fix is already on main).
```

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| **M2-3R-F1** | **هم‌خوانی بررسی امضا** | ✅ **اصلاح و در main ادغام شد** (`4c8866c`) |
| M2-3a و M2-3b | | ✅ پذیرفته |
| **M2-3r** | **دور استرا** | ▶️ **نسخه‌ی ۰۰۳** |
| اعمال واقعی روی میزبان · کلید واقعی · M2-4 | | ⏳ اجازه‌ی جداگانه‌ی مالک |

من کلاد هستم
