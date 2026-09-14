# بازبینی نگهبان معماری — G13d: اصلاح DTO قرارداد خواندن V2

**تاریخ:** ۱۴ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**commitها (محلی، push نشده):** `66b18bb` (سند) و `f39f3ee` (گزارش و Handoff)، روی `053197e`
**سند:** LF sha256 ‏`855aa828…47fc` · **گزارش:** LF sha256 ‏`6d672ac3…0d21`

## حکم: `APPROVED_WITH_FIXES`

**محتوای قرارداد `public-business.v1` حالا درست و قابل پیاده‌سازی است.**
- F1 تا F8 بسته شده‌اند.
- هیچ تصمیم S تغییر نکرده است.

ولی **F9 فقط نیمه اعمال شده و گزارش آن را کامل اعلام کرده است.**
- جدول نگاشت بخش ۴ (خط‌های ۸۰ تا ۸۵) هیچ تغییری نکرده و هنوز می‌گوید «تصمیم جداست».
- زیرعنوان خط ۲۵۵ هنوز «تصمیم‌های باز» است.
- گزارش هم برای F9 از بخش ۶ نام برده که اصلاً تغییر نکرده است.

Codex به‌هر‌حال پس از بازگشت سهمیه باید push کند. پس اصلاح این دو مورد **در یک commit کوچک پیش از همان push** (G13e) هزینه‌ی رفت‌وبرگشت اضافه ندارد.

---

## ۱. راستی‌آزمایی

Codex push نکرده بود. پس commitها را از object store مشترک و فقط خواندنی بررسی کردم. git config هیچ مخزنی تغییر نکرد. worktree ‏Codex مالک دیگری دارد و فقط با `-c safe.directory` یک‌باره خوانده شد.

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `053197e..f39f3ee`: فقط سه فایل مجاز · Handoff فقط الحاقی (۰ خط حذف) · worktree ‏Codex تمیز است · شاخه‌ی V2 (`f4d326f`) و main (`b521026`) بدون تغییر |
| **GW2-P** | ✅ برای بازبینی pinned ‏(`b521026`، `21d0a309…`) ثبت شده است |
| **hash** | ✅ سند `855aa828…` برابر گزارش است |

## ۲. وضعیت اصلاح‌ها

| # | وضعیت | شاهد |
|---|---|---|
| F1 | ✅ | `PublicBusinessExportV1 {contract_version, generated_at, snapshot_id, signature, records[]}` و `PublicBusinessRecordV1` · ارجاع `contract.ts:62-72` |
| F2 | ✅ | `signature` الزامی است و بدون `\| null` · نبود امضا فقط برای Mock ‏`draft-1` |
| F3 | ✅ | `display_name` حذف شد · **قاعده: هر فیلد محتوایی فقط از `published_content` می‌آید و ردیف زنده خوانده نمی‌شود** · یادداشت G14a اضافه شد |
| F4 | ✅ | `on_request: boolean` |
| F5 | ✅ | پیوند معکوس `capabilities[].capability_links` حذف شد |
| F6 | ✅ | `business.source_revision` |
| F7 | ✅ | قاعده‌ی تهی بودن مختصات و تبدیل Decimal با ۶ رقم (`schema.prisma:472-477`) |
| F8 | ✅ | `business_hours` و `terms`: JSON مطابق schema نسخه‌داری که G14b تعریف می‌کند |
| **F9** | ⚠️ **نیمه** | ✅ «projection» در خط‌های ۲۵ و ۱۰۷ اصلاح شد · ✅ S18 در خط ۱۰۹ درست شد · ✅ عنوان بخش ۱۲ و «جدول بالا» اصلاح شدند · ✅ فهرست metadata بخش ۵ هم‌خوان شد · ❌ **جدول نگاشت، خط‌های ۸۰ تا ۸۵، بدون تغییر** · ❌ **زیرعنوان خط ۲۵۵ «### تصمیم‌های باز»** |

**گزارش بیش از واقعیت ادعا کرده است.** گزارش می‌گوید «mappingهای S25/S26/discount اصلاح شدند» و از بخش ۶ نام می‌برد، ولی diff در بخش ۴ و ۶ هیچ hunkی ندارد. این چهارمین مورد از این نوع در این جریان است.

---

## ۳. دستور Codex — G13e (یک commit کوچک، سپس push همه)

```
INSTRUCTION_ID: CODEX-20260914-G13E-V2-READ-CONTRACT-F9-COMPLETION-001
TARGET_HANDOFF_ID: HANDOFF-20260914-GUARDIAN-G13D-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260914-V2-READ-CONTRACT
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G13D_V2_READ_CONTRACT_DTO_FIXES.md (PINNED_COMMIT/SHA256 relayed)
DECISION: APPROVED_WITH_FIXES - within the owner's S16-S26 design approval; no new approval needed.
MODE: DOCUMENT ONLY - ONE new commit on top of the LOCAL f39f3ee (do not rewrite or squash 66b18bb/f39f3ee).

PRECONDITION: GW2 or GW2-P on the pinned review; record the outputs; any failure -> STOP. Never touch credentials.

EDIT mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md (section 4 table rows and one subheading ONLY):
- line 80 `category`: v1 = not present (S25); a future category comes only from the first vertical module's
  versioned vocabulary (ADR-0011); NOT from Capability.categoryKey.
- lines 81-82 `location.floor_level` / `location.building_id`: not in v1 (S25); only via a separate CCR; V2 keeps
  mock/null.
- line 83 `products`: removed from public-business.v1 (S26); Offer/OfferVersion replaces it; draft-1 is mock only.
- line 85 `offers.discount_percent`: not in v1 (no Core source); no derivation from terms in v1.
- line 255 subheading "### تصمیم‌های باز" -> "### تصمیم‌های مالک (DECIDED)".
- Keep every existing citation in those rows. Change nothing else.

EDIT AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G13D_V2_READ_CONTRACT_DTO_FIXES_REPORT.md:
- append a section "۸. اصلاحیه‌ی G13e": state that the original F9 row overclaimed (section 4 and section 6 were
  NOT changed in 66b18bb), list the G13e changes above with the new commit SHA, and the new LF sha256 of the design
  doc (git show bytes).
Append only to mlino2/HANDOFF/HANDOFF_STATE.md.

PUSH: push codex/v2-read-contract-design (66b18bb, f39f3ee and the new commit) ONLY when the automated check allows
it. No workaround, no alternative remote or branch. If push is refused again -> STOP and report.
ALLOWED FILES (exactly three):
- mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md (the rows above only)
- AI_HANDOFF/CODEX_REPORTS/20260914_CODEX_G13D_V2_READ_CONTRACT_DTO_FIXES_REPORT.md (append a section)
- mlino2/HANDOFF/HANDOFF_STATE.md (append only)
FORBIDDEN:
- any other doc change, any code, test, config, schema, migration or Prisma file
- any change to the V2 branch
- any push to main
- rewriting existing commits
- changing any S item
- starting any G14 step
- Docker, databases, port 5435, _PUSH_STAGING, credentials, git config
```

## ۴. گام بعدی و پیشنهاد صرفه‌جویی در زمان

پس از G13e، نگهبان بررسی کوتاهی انجام می‌دهد: فقط شش خط و اصلاحیه‌ی گزارش. سپس سند نهایی را با `--no-ff` در main ادغام می‌کند.

مالک می‌تواند همین حالا یک تأیید مشروط بدهد تا دور دیگری لازم نشود:
> «ادغام سند نهایی قرارداد خواندن V2 در main، پس از تأیید G13e توسط نگهبان، مجاز است.»

**G14a** (CCR ستون `published_content`) همچنان تصویب جدا می‌خواهد.

## ۵. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| S16 تا S26 | | ✅ DECIDED |
| G13d | اصلاح DTO | ⚠️ APPROVED_WITH_FIXES: F1 تا F8 ✅ · F9 نیمه |
| **G13e** | **تکمیل F9 و push** | ▶️ صادر شد |
| ادغام سند در main | | ⏳ پس از G13e، با تأیید مالک (مشروط یا کوتاه) |
| G14a تا G14c | | ⏳ تصویب جدا |

من کلاد هستم
