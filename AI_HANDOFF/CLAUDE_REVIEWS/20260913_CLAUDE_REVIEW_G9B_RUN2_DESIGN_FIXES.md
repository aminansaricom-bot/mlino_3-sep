# بازبینی نگهبان معماری — G9b Run2: اصلاح طراحی لایه‌ی service

**تاریخ:** ۱۳ سپتامبر ۲۰۲۶
**بازبین:** Claude Opus 5 — MLINO Architecture Guardian
**گزارش بررسی‌شده:** `origin/codex/core-prisma-foundation:AI_HANDOFF/CODEX_REPORTS/20260913_CODEX_G9B_CORE_SERVICE_LAYER_DESIGN_FIXES_RUN2_REPORT.md`
**سند طراحی:** `mlino2/MLINO_CORE_SERVICE_LAYER_DESIGN.md` — ۲۹۳ خط، LF sha256 `4b69fdc6…0abc`
**commitها:** `0159971` (طراحی و گزارش) و `645f6e2` (Handoff)

## حکم: `APPROVED_WITH_FIXES`

**یافته‌های قرمز G9 در اصل بسته شدند.** قرارداد revision انتشار، تغییرناپذیری OfferVersion، مرز W1 و پایگاه داده، و ماشین حالت claim اکنون با migration می‌خوانند. نگاشت خطا دقیق است.

**سند برای تصمیم مالک آماده است.** یک شکاف امنیتی باقی مانده است: **مسیرهای ساختن authority** (افزودن عضو، اعطای grant، grant مؤسس خارج از bootstrap) بی‌قاعده مانده‌اند. این شکاف به‌صورت دو تصمیم تازه‌ی مالک (S10 و S11) مطرح می‌شود. بقیه‌ی اصلاح‌ها جزئی‌اند و همراه ثبت تصمیم‌های مالک در G9c اعمال می‌شوند.

---

## ۱. راستی‌آزمایی

| مورد | نتیجه |
|---|---|
| **دامنه** | ✅ `ec67c39..645f6e2`: سه فایل مجاز · Handoff و دو گزارش پیشین بدون حذف · `git diff --check` پاک · main (`59322dc`) و V2 (`f4d326f`) بدون تغییر |
| **hash گزارش** | ✅ `70333f73…f77f` |
| **GW2-P** | ✅ خروجی سه بررسی برای هر دو مرجع ثبت شده است. hashها با pinها برابرند. من هم مستقل بازتولیدشان کردم |
| **hash schema و migration** | ✅ `760b25b5…22ee4` و `99e7ae8a…751169`؛ خطای Y7 اصلاح شد |
| **پیام‌های trigger در جدول خطا** | ✅ هر ۱۰ پیام متمایز کلمه‌به‌کلمه با `migration.sql:763–1001` برابرند |

## ۲. وضعیت اصلاح‌ها

| # | وضعیت | یادداشت |
|---|---|---|
| R1 | ✅ | revision برابر · `FOR UPDATE` · انتشار دوباره فقط با revision بزرگ‌تر · withdraw با `published_content_revision` · NULL برای OfferVersion · جایگزینی در یک تراکنش با قفل Offer |
| R2 | ✅ | تغییرناپذیر از لحظه‌ی ساخت · DELETE ممنوع · پیوندها تا وقتی `published_at IS NULL` باشد · رقابت `version_number` |
| R3 | ✅ | جدایی تضمین درون‌ردیفی از W1 · الگوی signature · `where {id, organizationId}` · MATCH SIMPLE و C6 · S9 |
| R4 | ✅ با کمبود | گزینه‌ها و توصیه آمده‌اند. **ولی نگفته که DB «فقط یک‌بار» و «فقط در bootstrap» را برای grant مؤسس اجرا نمی‌کند** (`:675-683` فقط grantor تهی را می‌سنجد) ← F6 |
| R5 | ⚠️ ناقص | جدول مجوز هست. **ولی عملیات سازنده‌ی authority در آن نیستند:** افزودن Membership، اعطای Grant، ثبت claim، شروع verification، تأیید انسانی Capability و Evidence (ADR-0006). قاعده‌ای هم برای جلوگیری از ارتقای مجوز نیست ← S10، F5 |
| R6 | ⚠️ | جدول گذار هست، با سه مشکل: (۱) سطر «Membership در مسیر مجاز claim» با CHECK ‏`:616-625` نمی‌خواند؛ وضعیت‌های VERIFIED، SUSPENDED و REJECTED فقط با platform ref مجازند. (۲) گذار `REJECTED → PENDING` طبق CHECK ‏`:610-614` باید همه‌ی فیلدهای audit را تهی کند، یعنی **سابقه‌ی رد پاک می‌شود** ← S11. (۳) گذار `VERIFIED → EXPIRED` (`valid_until`) و تعارض index یکتای identifier ‏(C1، `:493-495`) نیامده‌اند ← F8 |
| Y1 | ⚠️ | «حداکثر یک» حذف شده، ولی جمله‌ی درست **«دقیقاً یک owner» (C7، `:587-589`) اضافه نشده است**، در حالی که گزارش آن را «applied» نوشته است ← F1 |
| Y2، Y3، Y4، Y7، Y8، Y9 | ✅ | |
| Y5 | ⚠️ | Offer ستون `updated_at` ندارد و ستونش `retired_at` است (`schema:530-545`). attempt متعلق به Verification است، نه Claim ← F2، F3 |
| Y6 | ⚠️ | S3 را به شکل «W1 یا W2» آورده است. **W1 با تصمیم D2 قطعی است**؛ S3 فقط این است که W2 **علاوه بر** W1 پذیرفته شود یا نه ← F7 |

**ارجاع‌های نادرست (F4):**
- `:626-695` برای Publication: این بازه CHECKهای audit و C9 و C10 است. الزام Membership در `schema:637` است.
- `:658-683` برای grant: درستش `:675-683` است؛ `:658-672` مربوط به verification است.
- `claim_attempt_unique`: نام درست `identity_verification_claim_attempt_unique` و محلش `schema:401` است.

## ۳. شکاف امنیتی باقیمانده: ارتقای مجوز

DB فقط شکل grant را می‌سنجد (C9: grant مؤسس بدون grantor؛ `member_grant` با grantor از همان سازمان). **DB این‌ها را نمی‌سنجد:**
- اینکه grantor خودش آن کلید را داشته باشد
- اینکه به خودش grant ندهد
- اینکه grant مؤسس خارج از bootstrap ساخته نشود
- اینکه آخرین مدیر grant قابل revoke نباشد

همه‌ی این قاعده‌ها فقط در service اجرا می‌شوند. بدون آن‌ها، هر عضوی که کلید مدیریت grant دارد می‌تواند همه‌ی مجوزها را به خودش بدهد. این هسته‌ی ADR-0009 است و باید پیش از G10 تصمیم‌گیری شود (S10).

## ۴. بسته‌ی تصمیم مالک

توصیه‌های من در ستون آخر آمده‌اند. هر جا با توصیه‌ی Codex فرق دارند، علامت ✱ خورده‌اند.

| # | موضوع | توصیه‌ی نگهبان |
|---|---|---|
| S1 | شکل API | service داخلی درون‌فرایندی در V1؛ HTTP فقط با نیاز اثبات‌شده |
| S2 | AuthContext | یک issuer قراردادی برای MVP. ✱ **سازمان انتخاب‌شده باید با یک Membership فعالِ همان subject در همان سازمان تأیید شود** |
| S3 | W2 | ✱ W1 طبق D2 قطعی است. W2 فعلاً پذیرفته نشود |
| S4 | idempotency | ✱ **بدون ستون تازه و CCR:** قرارداد revision خودش idempotent است. publish تکراری با همان revision به «قبلاً منتشر شده در revision N» نگاشت می‌شود (نتیجه‌ی موفق، نه خطا) |
| S5 | هویت پلتفرم | adapter مستقل با audit صریح |
| S6 | خطا | خطای domain پایدار + adapter جدا برای transport. SQLSTATE جدا برای هر trigger فقط در CCR آینده |
| S7 | محتوای `gate_snapshot` | ✱ `permission_key`، actor و زمان همین حالا ستون‌اند. snapshot شامل **شناسه‌ی grant به‌کاررفته + نسخه‌ی policy** باشد |
| S8 | محل کد | در `implementation/` (V1) با یک پوشه‌ی مستقل Core، جدا از `value-engines`. ماژول‌ها فقط از مرز عمومی service استفاده کنند |
| S9 | خواندن V2 | قرارداد نسخه‌دار و فقط‌خواندنی روی داده‌ی منتشرشده |
| R4 | bootstrap | AC-2، مالک شناسه‌ی سازمان (PR2)، با قرارداد رسمی. Organization، Membership مؤسس و grantهای founding در یک تراکنش، فقط یک‌بار |
| **S10** ✱ | **قاعده‌ی اعطای مجوز** | ‏(الف) `member_grant` فقط توسط Membershipی که کلید مدیریت grant **و** خودِ کلید اعطاشده را دارد. (ب) grant به خود ممنوع. (ج) founding فقط در تراکنش bootstrap. (د) revoke آخرین دارنده‌ی کلید مدیریت grant ممنوع است (جلوگیری از قفل شدن سازمان). (هـ) افزودن Membership فقط با کلید مدیریت عضویت. پیشنهاد: فعلاً اجرا در service با آزمون منفی؛ guard در DB فقط با CCR آینده در صورت نیاز |
| **S11** ✱ | **وضعیت‌های پایانی claim** | REJECTED و EXPIRED **پایانی** باشند. ارسال دوباره یعنی **ردیف claim تازه**. index یکتای C1 فقط VERIFIED و SUSPENDED را می‌گیرد، پس این کار مجاز است و سابقه‌ی رد دست‌نخورده می‌ماند |

## ۵. گام بعدی

**Next Task:**
1. مالک S1 تا S11 و R4 را تصمیم می‌گیرد.
2. Codex آن تصمیم‌ها و اصلاح‌های F1 تا F9 را در سند اعمال می‌کند (G9c، فقط سند).
3. پس از بازبینی G9c، طراحی برای تصویب نهایی مالک و آغاز G10 آماده است.

دستور G9c پس از رسیدن تصمیم مالک با pin کامل صادر می‌شود. **Codex تا آن زمان منتظر می‌ماند.**

```
INSTRUCTION_ID: CODEX-20260913-G9C-CORE-SERVICE-LAYER-OWNER-DECISIONS-001   (to be issued after owner decision)
TARGET_HANDOFF_ID: HANDOFF-20260912-CORE-PRISMA-FOUNDATION
REVIEW_REFERENCE: AI_HANDOFF/CLAUDE_REVIEWS/20260913_CLAUDE_REVIEW_G9B_RUN2_DESIGN_FIXES.md (PINNED_COMMIT/SHA256 relayed)
OWNER_DECISIONS: ________ (S1–S11, R4)
MODE: DOCUMENT ONLY. GW2 / GW2-P precondition as before.
TASK:
- Record the owner decisions in section 11 (status DECIDED, with the owner's wording).
- Apply F1–F9:
  F1 Evidence has exactly one owner (C7, :587-589)
  F2 Offer audit = created_at, retired_at (no updated_at)
  F3 attempts belong to IdentityVerification (schema:401)
  F4 correct the three wrong citations listed in section 2
  F5 permission table: add create Membership, issue Grant, submit Claim, start Verification,
     human-confirm Capability/Evidence; remove Membership as a claim status actor
  F6 state explicitly: the DB does not enforce founding-once/bootstrap-only or grant delegation;
     the service enforces them (S10), with negative tests
  F7 S3 = "adopt W2 in addition to the mandatory W1 (D2)"
  F8 claim table: VERIFIED→EXPIRED; C1 identifier conflict on VERIFIED (23505 → a specific domain error)
  F9 the test list gains S10/S11 negatives (self-grant, grant without the key, founding outside
     bootstrap, last-admin revoke, reuse of REJECTED)
- Report + append-only handoff, then STOP.
ALLOWED / FORBIDDEN: same as G9b-002.
```

## ۶. وضعیت دروازه‌ها

| دروازه | موضوع | وضعیت |
|---|---|---|
| G9 و G9b | طراحی و اصلاح | ✅ اصلاح‌های قرمز بسته شدند · ⚠️ اصلاح‌های جزئی به G9c می‌روند |
| **تصمیم مالک** | **S1 تا S11 و R4** | ⏳ **در انتظار مالک** |
| G9c | ثبت تصمیم‌ها + F1 تا F9 | ⏳ پس از تصمیم |
| G10 | پیاده‌سازی | ⏳ پس از بازبینی G9c و تصویب نهایی |

من کلاد هستم
