# بازبینی نگهبان — توقف دور استرا (M2-3r) به‌خاطر ناهمخوانی بررسی امضا

**تاریخ:** ۱۸ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — نگهبان معماری MLINO
**commitها:**
- نسخه‌ی اول: `8151deb` و `b4ac4ce` روی `f9e4875`
- نسخه‌ی دوم: `3ed8dfb` و `a809c2f` روی `be55774`

**نگهبان هر دو شاخه را با lease پیشروی روی سرور برد.**

## حکم: `APPROVED_NEXT_STEP`؛ یافته درست است و توقف بجا بود. اصلاح محدود مجاز شد و دور استرا ادامه می‌یابد

## ۱. یافته‌ی M2-3R-F1، تأییدشده به‌دست نگهبان

- **مشکل:** `verifyEnvelope` در `implementation/public-export/signing.ts:37-47` روی main، مقدار امضا را فقط با الگوی حروف مجاز می‌سنجد و بعد آن را با `Buffer.from(..., 'base64url')` باز می‌کند.
- **چرا مهم است:** امضای Ed25519 ۶۴ بایت است و در ۸۶ نویسه نوشته می‌شود. ۴ بیت آخرین نویسه بی‌استفاده‌اند، پس چند **نوشتار متفاوت برای همان امضا** وجود دارد. نسخه‌ی اول همه را قبول می‌کند، ولی نسخه‌ی دوم (`verify.ts`) فقط نوشتار استاندارد را می‌پذیرد.
- **پیامد:** فایلی که نسخه‌ی اول درست می‌داند و منتشر می‌کند، در نسخه‌ی دوم رد می‌شود و کاربر «در دسترس نیست» می‌بیند.
- **شدت: متوسط، از جنس دسترس‌پذیری.** جعل محتوا ممکن نیست، چون بایت‌های امضا و محتوای امضاشده همان است. مسیر عادی `signEnvelope` هم همیشه نوشتار استاندارد می‌سازد، پس این حالت فقط با دست‌کاری فایل پیش می‌آید.
- **ریشه:** همین نکته را در بازبینی G14c-2b (یادداشت N6) درباره‌ی نسخه‌ی دوم دیده بودم. نسخه‌ی اول هرگز با همان سخت‌گیری هم‌تراز نشد.

## ۲. رفتار کدکس

✅ **درست:**
- بازتولید را با کد واقعی هر دو نسخه و کلید آزمایشی ساخت.
- چهار آزمون کنترلی گذاشت: پذیرش عادی، دست‌کاری، کلید لغوشده و انقضا.
- چون اصلاح در فایلی بود که دستور ممنوع کرده بود، **دست نگه داشت** و کد محصول را تغییر نداد.

**یافته‌های باقی‌مانده که هنوز اجرا نشده‌اند:**
- **O1:** سقف اندازه پیش از خواندن فایل وجود ندارد.
- **O2:** پنجره‌ی زمانی ۳۰۰ ثانیه برابر با TTL است (همان G10).
- **O3:** rename ویندوز فقط یک بار تلاش می‌شود (همان G11).

## ۳. تصمیم نگهبان

اصلاح در دامنه‌ی تصویب M2-3 است، چون هدف M2-3 هم‌خوانی اجزا پیش از اتصال واقعی بود. تغییر فقط **سخت‌گیرانه‌تر کردن** بررسی است: قرارداد عوض نمی‌شود و رفتار با فایل‌های عادی تغییر نمی‌کند. پس به‌عنوان **تنها استثنای** ممنوعیت محصول مجاز شد.

این اصلاح روی شاخه‌ی نسخه‌ی اول می‌ماند و فقط **هنگام ادغام آن شاخه در main، با اجازه‌ی مالک،** وارد main می‌شود.

## ۴. دستور کدکس — ادامه‌ی دور استرا (۰۰۲)

```
INSTRUCTION_ID: CODEX-20260918-M2-3R-ASTRA-JOINT-REVIEW-002
SUPERSEDES: CODEX-20260918-M2-3R-ASTRA-JOINT-REVIEW-001 (its items 1-5, allowed files and forbidden list still
  apply UNCHANGED except for the single exception in item 0)
TARGET_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-M2-3R-PARITY-STOP
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-PUBLIC-EXPORT-OPERATIONS
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_M2_3R_SIGNATURE_PARITY_STOP.md (PINNED_COMMIT/SHA256 relayed)
MODEL: ASTRA.
SCOPE: the same two branches, now on origin at
  V1 codex/public-export-distribution @ b4ac4ce9ed82ef40ffb4da8816019d0d98e73763
  V2 codex/v2-public-export-route     @ a809c2f7255cbe8ea2208d0da983a8d8b6b95e4a
  Each local HEAD must equal the SHA above (else STOP). LOCAL commits on top only; no push, rebase, amend or force.
PRECONDITION: GW2 or GW2-P on the pinned record; record the outputs; any failure -> STOP.

0 THE ONLY PRODUCT EXCEPTION (Guardian-authorized, finding M2-3R-F1), on the V1 branch:
  implementation/public-export/signing.ts, function verifyEnvelope ONLY: accept signature.value only if it is
  canonical unpadded base64url that decodes to EXACTLY 64 bytes and re-encodes to the identical string; otherwise
  return false. Do not change signEnvelope, signedBytes, DOMAIN_SEPARATOR or any other function or file of the
  V1 product (builder, canonical, cli, key-providers stay forbidden).
  Tests (failing-then-passing, recorded): a non-canonical spelling of a valid signature (flip an unused trailing
  bit), a 63-byte and a 65-byte value, padding '=', and the valid canonical value still passing; the existing
  public-export and key-provider specs must stay green. Turn the M2-3R-F1 diagnostic into a permanent jest test
  showing V1 now REJECTS what V2 rejects, and record the before/after output.
1-5 Then complete items 1-5 of -001 exactly as written: the cross-component end-to-end fixture (now expected to
  agree on BOTH the canonical and the non-canonical case), timing G10 / O2, Windows rename G11 / O3, the
  adversarial list including the 2,000,000-byte size cap O1, and the THREE-run validation on both branches.
REPORT: update (append a new section to) AI_HANDOFF/CODEX_REPORTS/20260918_CODEX_M2_3R_ASTRA_REVIEW_REPORT.md on
  EACH branch with the findings table (F1 now fixed: commit + test names), the fixture sha256, the timing decision,
  the rename-lock result, run totals with skips and reasons, LF sha256, GW2/GW2-P outputs. Append only to
  mlino2/HANDOFF/HANDOFF_STATE.md. Commit locally and STOP.
ALLOWED FILES: those of -001, PLUS implementation/public-export/signing.ts (verifyEnvelope only) on the V1 branch.
FORBIDDEN: everything forbidden in -001 except that single function.
```

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| M2-3a و M2-3b | | ✅ پذیرفته |
| **M2-3r** | **دور استرا** | ⏸️ توقف بجا · F1 تأیید شد · ▶️ **ادامه با نسخه‌ی ۰۰۲** |
| اعمال واقعی روی میزبان · کلید واقعی · M2-4 | | ⏳ اجازه‌ی جداگانه‌ی مالک |

من کلاد هستم
