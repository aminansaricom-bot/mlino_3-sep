HANDOFF_ID: HANDOFF-20260906-CCR-APPLY-AC2-ADAPTER
AUTHOR: CLAUDE
PHASE: OWNERSHIP_CCR_APPLIED_PLUS_REAL_AC2_ADAPTER
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
EXECUTED_INSTRUCTION_ID: CODEX-20260906-0019-CCR-APPLY-ADAPTER-AUTH
PREVIOUS_HANDOFF_ID: HANDOFF-20260905-AC2ALIGN-REVIEW-ACK

---

# گزارش — اعمال CCR فیلد مالکیت (مرحله الف) + Adapter واقعی AC-2 (مرحله ب)

## ۱. دستور اجراشده و تطبیق

`CODEX-20260906-0019-CCR-APPLY-ADAPTER-AUTH`. **تطبیق قبل از اجرا:** `TARGET_HANDOFF_ID` (`HANDOFF-20260905-AC2ALIGN-REVIEW-ACK`) و `TARGET_REPORT_SHA256` (`787babc9...`) با `HANDOFF_STATE.md` وقت اجرا دقیقاً منطبق بودند.

---

## ۲. مرحله‌ی الف — اعمال CCR (شواهد مستقل این مرحله)

### ۲.۱. تغییرات

| فایل | ماهیت |
|---|---|
| `prisma/schema.prisma` | `enum OwnershipType { ORGANIZATIONAL }` + فیلد `ownershipType @default(ORGANIZATIONAL) @map("ownership_type")` روی `EventLog` و `OpportunityCurrentState` |
| `shared-contracts/types.ts` | فقط `export type OwnershipType = 'ORGANIZATIONAL';` |
| `prisma/migrations/20260906001500_add_ownership_type/migration.sql` | Migration جدید طبق SQL پیش‌نویس CCR + یادداشت الزامی Backfill |
| `foundation/event-log/event-log.service.ts` | پرکردن صریح `ownershipType: 'ORGANIZATIONAL'` در مرز Admission |
| `foundation/opportunity-projection/rebuild-projection.service.ts` | حمل مقدار از رویداد بنیان‌گذار به ردیف Projection |

### ۲.۲. Migration روی Postgres واقعی

```
Applying migration `20260906001500_add_ownership_type`
All migrations have been successfully applied.
✔ Generated Prisma Client (v5.22.0)
```

یادداشت الزامی داخل خود فایل Migration درج شد: مقدار `ORGANIZATIONAL` روی ردیف‌های تاریخی **«مشتق از سیاست مصوب مالک محصول است، نه ثبت‌شده در لحظه‌ی تولید»** — با ارجاع به Kernel §۱۰ و §۴.۱ سند طراحی.

### ۲.۳. دروازه‌ی مرحله‌ی الف — سبز

```
Test Suites: 14 passed, 14 total
Tests:       134 passed, 134 total     (۱۳۰ قبلی + ۴ تست مرحله الف، صفر Regression)
```

۴ تست جدید (`test/foundation/ownership-type.spec.ts`): مقدار روی Insert جدید؛ **جریان واقعی Admission → Projection** (مقایسه‌ی مقدار ردیف Projection با مقدار رویداد بنیان‌گذار، نه صرفاً «مقدارش ORGANIZATIONAL است»)؛ Backfill روی ردیفی که ستون را اصلاً نام نمی‌برد؛ و رد `INDIVIDUAL` توسط خود دیتابیس (تضمین دامنه‌ی تک‌مقداری CCR).

**دروازه سبز شد، پس مرحله‌ی ب آغاز شد.**

---

## ۳. مرحله‌ی ب — Adapter واقعی AC-2

### ۳.۱. تغییرات

| فایل | ماهیت |
|---|---|
| `foundation/access-decision/org-membership-ac2-port.ts` | **جدید** — `OrgMembershipAC2DecisionPort` + نمونه‌ی تولیدی `orgMembershipAC2DecisionPort` |
| `foundation/access-decision/ac2-decision-port.ts` | فقط افزودن `ownership_type?` به `OpportunityAccessCandidate` (فایل غیرمنجمد، طبق CCR §۵) |
| `foundation/opportunity-read/access-candidate.ts` | پرکردن `ownership_type` از ردیف Projection |
| `test/foundation/access-decision/org-membership-ac2-port.spec.ts` | **جدید** — ۱۲ تست |

### ۳.۲. قواعد پیاده‌شده (سیاست v1.1)

allow فقط وقتی **هر سه** برقرار باشند: (۱) Actor ساختاراً معتبر با نقش شناخته‌شده‌ی V1 (قاعده ۱) — (۲) هم‌سازمانی (قاعده ۲) — (۳) مالکیت **ثبت‌شده‌ی** `ORGANIZATIONAL` (قواعد ۳+۴). هر چیز دیگر → `deny` همان کاندیدا. هیچ شاخه‌ای `throw` نمی‌کند: یک کاندیدای بدشکل کل Batch را از کار نمی‌اندازد.

### ۳.۳. تست‌ها (Postgres واقعی)

```
Test Suites: 15 passed, 15 total
Tests:       146 passed, 146 total     (۱۳۰ قبلی + ۴ مرحله الف + ۱۲ مرحله ب)
یک اجرا، بدون Retry
npx tsc --noEmit → CLEAN (Exit 0)
```

پوشش: عضو همان سازمان + مالکیت ثبت‌شده → allow؛ سازمان دیگر → deny (حتی با شناسه‌ی درست)؛ **مالکیت ثبت‌نشده → deny** (قاعده ۳)؛ مقدار مالکیت ناشناخته → deny؛ نقش ناشناخته → deny؛ `actor_id` خالی → deny؛ یک کاندیدای بد فقط خودش را deny می‌کند و کاندیدای سالم در همان Batch عبور می‌کند؛ تزریق Evidence همچنان مسدود؛ Port که `throw` می‌کند همچنان fail-closed؛ و **ترتیب AC-2 قبل از `intended_audience`** (فرصت manager-only از AC-2 عبور می‌کند اما از فید منشی حذف می‌شود).

---

## ۴. Drift دو فایل منجمد — عمدی، مجاز، و توجیه‌شده

**این تنها پاسی است که Drift غیرصفر انتظار می‌رود** (طبق CCR §۷ و بند ۴ دستور):

| فایل | چک‌سام قبل | چک‌سام بعد | توجیه |
|---|---|---|---|
| `prisma/schema.prisma` | `84d138c2222647521f981afefc69944b87b6d2b091cc0f3747e2d0599f37eff0` | `673b82204483dbf14071f0c545ed9a851834838a9d46b0177abeec7d38f3e4ef` | CCR مصوب، بند ۳ |
| `shared-contracts/types.ts` | `35d218065f9829f2d9c258d082ba6a2fd48588c573a44f722d35fad6dcb76296` | `bc0ca61e41640a00eedd7a9288bfcfa1f735128cd514ce79586f3792f1a0deb6` | CCR مصوب، بند ۵ |

هیچ تغییر دیگری در این دو فایل انجام نشد.

## ۵. چک‌سام فایل‌های تغییر/جدید

| فایل | SHA-256 |
|---|---|
| `prisma/schema.prisma` | `673b8220...` |
| `shared-contracts/types.ts` | `bc0ca61e...` |
| `prisma/migrations/20260906001500_add_ownership_type/migration.sql` | `584ef0d3ff9c7d6e0640a80ca8da1ebc63e06fb5505fd78b5a663d266db93509` |
| `foundation/access-decision/org-membership-ac2-port.ts` | `3107aadf92eb6448880b1f429b6a6768f7c447e007be462bd20d426a739ee6b5` |
| `foundation/access-decision/ac2-decision-port.ts` | `a05d87fef7367cccd22ea956f919798bc25fb934b21dcdb004e55ad2e0e9fb70` |
| `foundation/opportunity-read/access-candidate.ts` | `9125c4fbc565db793f1a7485c680d4323db812fd4c417e1058a04698ffbe92d1` |
| `foundation/event-log/event-log.service.ts` | `6b8024eeefd43bd229b8dc188fc52b8de0cc03baaecc7ad150c7dbf6c665172b` |
| `foundation/opportunity-projection/rebuild-projection.service.ts` | `71bf2533ad42fb316d1031e500084f8603bb857970620227495db5728fcc50bd` |
| `test/foundation/ownership-type.spec.ts` | `4ec89a665e1610242e9be2042685401098f90aaa3efe90ff253c2eb229149b02` |
| `test/foundation/access-decision/org-membership-ac2-port.spec.ts` | `9926306bca6811149fc16481613f25b668ac06429e23d528ecce46fd2b5c3312` |

## ۶. بررسی ممنوعیت‌ها — با شواهد، نه ادعا

- **`OpportunityReadService` دست‌نخورده:** SHA-256 فعلی (`2360a074...`) با نسخه‌ی موجود در آخرین Commit کد (`fe1bdf0`) **بایت‌به‌بایت یکسان** است.
- **`evaluateAC2FailClosed` دست‌نخورده:** `diff` بدنه‌ی تابع بین نسخه‌ی `fe1bdf0` و نسخه‌ی فعلی → **IDENTICAL**. (تنها تغییر آن فایل، افزودن فیلد به `OpportunityAccessCandidate` است.)
- **Import بین‌Featureای:** `grep` روی `foundation/` → صفر.
- **Prisma خارج از `foundation/`:** صفر (به‌جز تست‌ها).
- **Featureها / `jest.config.js` / `mlino2/`:** لمس نشدند.
- **مقدار enum غیر از `ORGANIZATIONAL`:** ساخته نشد — و با تست تضمین شد که دیتابیس هم آن را نمی‌پذیرد.

## ۷. آنچه عمداً ساخته نشد

- **هیچ منطق Consent** — نه رویداد، نه Projection، نه ارزیابی. R8-a.
- **مقادیر `INDIVIDUAL` / `AGGREGATE`** — نه در enum پریزما، نه در تایپ TS، حتی به‌عنوان مقدار غیرفعال.
- **لایه‌ی دانش (Insight)** — هیچ Schema، هیچ خط تولید، هیچ آستانه. R8-b.
- **سناریوهای ۸–۱۲ برنامه‌ی ۱۷‌گانه** (داده‌ی فردی بدون Consent، Consent لغوشده/منقضی، Data Type اشتباه، Consumer اشتباه) — **امروز قابل‌اجرا نیستند** چون نه داده‌ی Consent وجود دارد و نه مقدار مالکیت فردی. در فایل تست صریحاً به‌عنوان «حذف عمدی با ارجاع به R8-a/R8-b» مستند شدند، نه skip خاموش.
- **هیچ جدول عضویت جدید** — بند ۸ پایین.

## ۸. پنج تصمیم فراتر از متن صریح دستور (برای قضاوت بازبین)

طبق الگوی جاافتاده، مواردی که خودم تصمیم گرفتم و باید مستقل قضاوت شوند:

**۸.۱. در `types.ts` فقط تایپ اضافه شد، هیچ فیلدی روی هیچ DTO.** CCR §۵ گفته بود «*احتمالاً* نیازمند افزودن `OwnershipType` و فیلد متناظر روی DTOهای مرتبط». بررسی کردم: `EventCandidateDTO` نباید فیلد بگیرد (فاز ۱ مصوب = Admission-fill، Producer ارسال نمی‌کند)، و `OpportunityProjectionDTO` هم نیازی ندارد (هیچ مصرف‌کننده‌ای بیرون از مرز AC-2 به آن نیاز ندارد؛ افزودنش گسترش دامنه بود). پس حداقلِ واقعی فقط خود تایپ بود. **اگر منظور CCR افزودن فیلد به DTO بوده، این را اصلاح کن.**

**۸.۲. `ownership_type` روی `OpportunityAccessCandidate` اختیاری (`?`) تعریف شد، نه اجباری.** دلیل: اگر اجباری بود، «کاندیدای بدون مالکیت» به خطای زمان کامپایل تبدیل می‌شد و مسیر fail-closed زمان-اجرا (قاعده ۳) عملاً غیرقابل‌تست می‌شد. با اختیاری‌بودن، همان قاعده واقعاً اجرا و تست می‌شود. **این یک انتخاب طراحی است، نه الزام دستور.**

**۸.۳. دو فایل خارج از فهرست صریح دستور تغییر کردند:** `event-log.service.ts` و `rebuild-projection.service.ts`. هیچ‌کدام در فهرست ممنوعه نبودند، و بدون آن‌ها تست الزامی «عبور مقدار از Admission تا Projection» (بند ۱.۵ دستور) معنا نداشت — مقدار در هر جدول مستقلاً default می‌خورد و هرگز «جریان» نمی‌یافت. صراحت در کد را به اتکای خاموش به `@default` ترجیح دادم چون Kernel §۱۰ «تعیین صریح» را ایده‌آل می‌داند.

**۸.۴. هیچ نقطه‌ی سیم‌کشی تولیدی وجود نداشت.** بند ۲.۲ دستور خواسته بود Fake در مسیرهای تولیدی با Adapter واقعی جایگزین شود. بررسی کردم: `OpportunityReadService` **فقط در تست‌ها** ساخته می‌شود — هیچ Composition Root یا لایه‌ی API در این کدبیس وجود ندارد. پس مجموعه‌ی «نقاط تولیدی» تهی بود. **یک لایه‌ی API ساختگی اختراع نکردم** تا جایی برای سیم‌کشی داشته باشم؛ به‌جایش نمونه‌ی تولیدی `orgMembershipAC2DecisionPort` را export کردم تا نقطه‌ی ورود آینده آن را تزریق کند، و همین محدودیت را در JSDoc نوشتم.

**۸.۵. سطح دوم سیاست §۳ (مالکیت هر Evidence) پیاده نشد.** CCR عمداً مالکیت را فقط به `event_log` و `opportunity_current_state` افزود، نه به `EvidenceRef` — که تا زمانی که R4 مسدود است، مرجع مبهم و غیرقابل‌Resolve باقی می‌ماند. پس Adapter دقیقاً مجموعه‌ی Evidence خود کاندیدا را مجاز می‌کند و نمی‌تواند زیرمجموعه‌ای بر اساس مالکیت Evidence ببندد. **این محدودیت شناخته‌شده و ثبت‌شده است، نه سهو** — در JSDoc صریح آمده. تزریق همچنان غیرممکن است (فیلتر `evaluateAC2FailClosed`).

## ۹. اقدام بعدی

**متوقف می‌شوم** طبق شرط توقف. بازبینی مستقل هر دو مرحله را ممد یکجا انجام می‌دهد.

گپ‌های باز بدون تغییر: R4 (BLOCKED)، R5 (OPEN عمدی)، R8-a/R8-b (OPEN). Adapter هیچ‌کدام را حل نکرد و ادعای حل‌کردنشان را هم ندارد.
