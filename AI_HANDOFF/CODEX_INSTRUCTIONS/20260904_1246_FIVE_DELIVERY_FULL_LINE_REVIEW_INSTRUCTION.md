INSTRUCTION_ID: CODEX-20260904-1246-FIVEDELIVERY-FULLLINE-REVIEW
AUTHOR: CODEX
STATUS: READY_FOR_CLAUDE
TARGET_HANDOFF_ID: HANDOFF-20260904-F02F03-LOOKUP-WIRING
TARGET_REPORT_PATH: C:\mlino code\AI_HANDOFF\CLAUDE_REPORTS\20260904_F02_F03_SITUATION_LOOKUP_WIRING_REPORT.md
TARGET_REPORT_SHA256: b0f66f5c7c0898b8bad6dce13bda759c542855c77615cb3610f59d2ad969df94
TARGET_ZIP_PATH: (none — ZIP برای این پاس ساخته نشده بود؛ بازبینی مستقیم روی کدبیس کاری انجام شد)
TARGET_ZIP_SHA256: (n/a)
REVIEW_COMPLETED_AT: 2026-09-04T12:46:00
AUTHORIZATION_SCOPE: ACKNOWLEDGE_FIVE_DELIVERIES_AS_REVIEWED_AND_CARRY_FORWARD_OPEN_GAPS_NO_NEW_CODE_MANDATED

---

# نتیجه‌ی بازبینی مستقل — پنج تحویل پیاپی (بازبینی یکجا)

**بازبین:** ممد (مدل GLM 5.3 Flash روی OpenCode — جانشین Codex طبق تصمیم صریح کاربر/مالک محصول)
**تاریخ بازبینی:** ۲۰۲۶-۰۹-۰۴
**مستند تفصیلی:** `C:\mlino code\AI_HANDOFF\MAMAD_INDEPENDENT_REVIEW_20260904_FIVE_DELIVERIES.md` (شواهد کامل هر جدول همین دستور، آنجاست)

**مهم:** اگرچه TARGET_HANDOFF_ID/REPORT/SHA256 بالا به **آخرین** تحویل ارجاع می‌دهند (طبق پروتکل)، این بازبینی **هر پنج تحویل** زیر را با هم پوشش داده است:

1. `HANDOFF-20260815-2350-FP02CORE` — FP-02 Core Implementation
2. `HANDOFF-20260903-SELFREVIEW-FP02` — خودارزیابی + رفع باگ دفاعی AC2
3. `HANDOFF-20260903-SITUATIONLOOKUP` — پیاده‌سازی SituationLookupInterface
4. `HANDOFF-20260903-F01-LOOKUP-WIRING` — Wiring F-01
5. `HANDOFF-20260904-F02F03-LOOKUP-WIRING` — Wiring F-02/F-03 (این Target)

---

## ۱. نتیجه‌ی هر پنج مورد

| # | تحویل | نتیجه |
|---|---|---|
| ۱ | FP-02 Core Implementation | **تایید می‌شود** |
| ۲ | خودارزیابی + رفع باگ AC2 | **تایید می‌شود** (رفع باگ صحیح و با تست رگرسیون) |
| ۳ | SituationLookupInterface | **تایید می‌شود** (شامل تصمیم رفع‌ابهام چند-مورد — سند CONTRACT_RESOLUTION معتبر است) |
| ۴ | Wiring F-01 | **تایید می‌شود** |
| ۵ | Wiring F-02/F-03 | **تایید می‌شود** (شامل اعتبارسنجی مستقل استدلال no-`expires_at` — بند ۳ این دستور) |

**Verdict کلی: تایید فنی — بدون عیب مسدودکننده. هیچ اصلاحی توسط بازبین لازم شد و انجام شد صفر.**

## ۲. شواهد راستی‌آزمایی‌شده‌ی مستقیم (خلاصه)

1. **Drift صفر هر دو فایل منجمد** — SHA-256 مستقیم توسط بازبین: `types.ts` = `35d218065f9829f2d9c258d082ba6a2fd48588c573a44f722d35fad6dcb76296`، `schema.prisma` = `84d138c2222647521f981afefc69944b87b6d2b091cc0f3747e2d0599f37eff0` — هر دو دقیقاً منطبق با `FP02_CHECKSUM_MANIFEST.txt`.
2. **اجرای مستقل کامل تست‌ها روی Postgres واقعی** (کانتینر `mlino-v1-local-db`، پورت ۵43۵): **Test Suites: 13 passed / Tests: 122 passed** — یک اجرا، بدون Retry، توسط خود بازبین.
3. **صفر Import بین‌Featureای** — grep روی `value-engines/`، `feed/`، `briefing/`.
4. **Prisma فقط در `foundation/`** — grep کل `implementation/` (تست‌ها فقط wrapper خود foundation را Import می‌کنند — این الگو از Wave 1 موجود و مجاز است).
5. **`event_log` فقط یک نویسنده** — تنها `foundation/event-log/event-log.service.ts:54` در کد تولیدی `eventLog.create` می‌زند؛ سایر مطابقت‌ها `deleteMany` پاک‌سازی تست‌ها هستند.
6. **هر ۷ چک‌سام فایل‌های تغییریافته‌ی ادعاشده در گزارش‌های ۲۰۲۶۰۹۰۳/۲۰۲۶۰۹۰۴** — محاسبه‌ی مستقیم، دقیقاً منطبق.
7. **بازخوانی خصمانه‌ی کد امنیتی:** ماتریس fail-closed کامل `evaluateAC2FailClosed` (throw/غیرآرایه/کاندیدای گم/allow نامعتبر/subject خالی/تزریق Evidence — همگی بسته)، سیاست S2 در `toDTO` (فقط `authorized_evidence_refs` افشا می‌شود)، پرهیز از Existence Oracle در `getOpportunityById`، CR-03 (عدم ادغام بر اساس `situation_key`) سالم، و حلقه‌ی `amendsEventId` بسته (Admission R3 در `admission-validator.ts:125-158` هدف را به بنیان‌گذار هم‌خانواده محدود می‌کند و `event-log.service.ts:65` آن را از `opportunity_correlation_id` تنظیم می‌کند).

## ۳. اعتبارسنجی مستقل استدلال no-`expires_at` (ماموریت ویژه‌ی §۳.۵ سند ماموریت)

استدلال یونس (F-02/F-03 بدون `expires_at` → همیشه ACTIVE تا RETRACTION/تغییر هویتی) **در برابر `CONTRACT_RESOLUTION/R5_STABLE_SITUATION_IDENTITY_SPEC.md` راستی‌آزمایی شد و تایید است:**

- **F-02:** §F-02 صراحتاً پایان وضعیت را **هویتی** تعریف می‌کند («نوبت جایگزین شد → دیگر یک فرصت نیست» — AMENDMENT/Retraction طبیعی)، نه زمانی. نداشتن `expires_at` مطابق مشخصه است، نه نقص.
- **F-03:** §F-03 صراحتاً می‌گوید همان `(patient, lastInteractionAt)` با گذشت زمان → همان `situation_key`/AMENDMENT؛ تعامل جدید → `situation_key` جدید/وضعیت مستقل. دقیقاً همان رفتار پیاده‌شده.
- موتور Projection (`compute-projection.ts:70`) فقط در صورت `expires_at != null` زمانی منقضی می‌کند — سازگار.
- **توجه:** مسیر RETRACTION (مثلاً rebook واقعی نوبت F-02 که باید وضعیت را ببندد) کماکان **Gap باز** است — این قبلاً صادقانه ثبت شده و با این تایید «حل‌شده» تلقی نمی‌شود.

## ۴. یافته‌های غیرمسدودکننده (برای اقدام آینده — نه اکنون)

- **F-1 (LOW):** در `evaluateAC2FailClosed`، تصمیم‌های تکراری با یک `opportunity_correlation_id` از سمت Port رفتار «آخری‌برنده» دارند؛ همچنین کاندیداهای ورودی با id تکراری در Map نتیجه تداخل می‌کنند. شکاف امنیتی نیست (fail-closed در برابر خطا است، نه بدخواهی Port مجاز)؛ پیشنهاد: هاردنینگ قطعی‌سازی در اولین پاس کاری آینده.
- **F-2 (INFO):** placeholder `['__none__']` در `rebuild-projection.service.ts:102` — رفتار درست، فقط non-idiomatic.
- **F-5 (سند):** `MUSE_SPARK_DEVELOPER_ONBOARDING.md` §۳ کهنه است (۱۰۵/۱۰۵؛ واقعیت ۱۲۲/۱۲۲ + پنج تحویل) و تغییر نقش بازبین در آن منعکس نیست. به‌روزرسانی توسط یونس.
- **F-4 (پروتکل — بسته‌شده با همین بازبینی):** چهار پاس ۰۹۰۳/۰۹۰۴ با اختیار مستقیم کاربر و بدون چرخه‌ی رسمی انجام شدند؛ خودِ گزارش‌ها این را صادقانه ثبت کرده بودند. با این بازبینی مستقل یکجا، خلأ پر شد.

## ۵. گپ‌های باز (بدون تغییر — هیچ‌کدام با این بازبینی حل نشده‌اند)

- **R4 (Evidence Integrity)** — BLOCKED (نیازمند تصمیم معماری).
- **R5-Concurrency/Uniqueness** — OPEN (Lookup عمداً Advisory-only است و باید بماند).
- **Adapter واقعی Governance برای AC-2** — وجود ندارد؛ تا اتصال واقعی، استفاده‌ی تولیدی از `OpportunityReadService` نیازمند Adapter واقعی است.
- **مسیر RETRACTION** (برای F-02 و به‌طور عام) — پیاده‌سازی نشده.

## ۶. دستور به یونس (Claude)

1. **کدنویسی/اصلاح جدید: مجاز نیست** — هیچ اصلاح کد الزامی نیست؛ همه‌ی پنج تحویل تایید شده‌اند.
2. **فایل‌های ممنوع همیشگی:** `shared-contracts/types.ts` و `prisma/schema.prisma` (مگر با CCR/ACR رسمی).
3. **مجاز (اختیاری، سندسازی):** به‌روزرسانی `MUSE_SPARK_DEVELOPER_ONBOARDING.md` §۳ با وضعیت واقعی فعلی (۱۲۲/۱۲۲، پنج تحویل بازبینی‌شده) — کد دست نخورد.
4. **شروع فاز بعدی (مسیر RETRACTION، Adapter واقعی AC-2، حل R5، هر Feature جدید): مجاز نیست — منتظر بمان** تا مالک محصول تصمیم بدهد و یک دستور بازبینی/مجوز جدید در همین پروتکل ثبت شود.
5. **تست الزامی قبل از هر Commit/تحویل آینده:** کل `npm test` — حداقل ۱۲۲ از ۱۲۲ سبز (یا بیشتر اگر تست جدید اضافه شود)، روی Postgres واقعی، با `maxWorkers: 1` دست‌نخورده.
6. **گزارش بعدی:** در `AI_HANDOFF/CLAUDE_REPORTS/` طبق فرمت همیشگی، با `HANDOFF_ID` کاملاً جدید (این INSTRUCTION_ID هرگز دوباره استفاده نمی‌شود).
7. **Push:** تغییرات (این دستور + گزارش بازبینی مستقل) باید به `https://github.com/aminansaricom-bot/mlino_3-sep` Push شوند. (بازبین در این جلسه به هیچ مخزن Git در `C:\mlino code` دسترسی نداشت — Push را یونس/کاربر انجام دهد.)

## ۷. شرط توقف (Stop Condition)

یونس پس از خواندن این دستور، ثبت Acknowledgement در گزارش جدید خود (یا صرفاً انتظار برای دستور بعدی کاربر — بند ۶.۴) **متوقف شود**. هیچ کار کدی پیش‌دستانه انجام نده.

---
*بازبین: ممد (GLM 5.3 Flash) — تعارض منافع: صفر (تمام کد بازبینی‌شده توسط یونس/Claude تولید شده است).*
