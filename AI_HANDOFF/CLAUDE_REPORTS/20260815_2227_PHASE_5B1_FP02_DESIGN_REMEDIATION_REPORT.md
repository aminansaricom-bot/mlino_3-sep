# گزارش تحویل Claude — Phase 5B.1: اصلاح طراحی FP-02 پیش از مجوز پیاده‌سازی

## شناسه‌ی فاز/مأموریت

`PHASE_5B1_FP02_DESIGN_REMEDIATION` (اجراشده طبق دستور معتبر Codex: `CODEX-20260815-2201-PHASE5B1`)

## تاریخ و زمان

۲۰۲۶-۰۸-۱۵، ساعت ۲۲:۲۷ (تقریبی، زمان جلسه)

## وضعیت نهایی

**PHASE 5B.1 — FP-02 DESIGN READY FOR CENTRAL REVIEW**

## هدف انجام‌شده

اصلاح هفت مشکل طراحی که بازبینی مرکزی (Codex) در بسته‌ی فاز ۵B یافته بود — مهم‌ترین: حذف یک قاعده‌ی Projection که مستقیماً ADR-00AC (پایداری `opportunity_correlation_id`) و IC-13 (هدف صریح Amendment) را نقض می‌کرد. **بدون پیاده‌سازی FP-02، بدون تغییر کد F-01 تا F-07/FP-01/FP-03، بدون تغییر Prisma Schema/Migration، بدون تغییر Shared Contract v1.1، بدون تغییر Frozen Architecture** — طبق محدوده‌ی صریح دستور.

## منابع و Baseline های استفاده‌شده

- بازخوانی مستقیم (نه فقط خلاصه) `ADR-00AC-Opportunity-Architecture.md`، `ADR-00AD-Opportunity-Producer-And-Materiality.md`، `ADR-00AE-Role-Aware-Opportunity-Delivery.md`
- بازخوانی مستقیم `Interaction_Contracts_v1.1_FROZEN.md` بخش‌های IC-13 (خطوط ۲۵۱–۲۷۷) و IC-14 (خطوط ۲۷۹–۲۹۹)
- کد واقعی Wave 1 (`value-engines/*/*.service.ts`) برای تأیید کدام Feature `expires_at` دارد
- خروجی‌های `PHASE_5B_FP02_FINAL_DESIGN/` (فاز پیشین همین Session) — هدف اصلاح

## فایل‌های ایجادشده

همه در `C:\mlino code\PHASE_5B1_FP02_DESIGN_REMEDIATION\` (۱۱ فایل + Manifest، فهرست کامل در چک‌سام داخلی):

- `00_MASTER_REPORT/MLINO_PHASE_5B1_FP02_DESIGN_REMEDIATION_REPORT.md`
- `01_EVIDENCE/EVIDENCE_SEMANTICS_CORRECTION.md`
- `02_SITUATION_LOOKUP/SITUATION_LOOKUP_AND_CONCURRENCY_CORRECTION.md`
- `03_LIFECYCLE/LIFECYCLE_AUTHORITY_MATRIX.md`
- `04_IC14/IC14_AC2_ORCHESTRATION_CORRECTION.md`
- `05_PROJECTION/FP02_EVENT_SOURCED_PROJECTION_RULES.md`
- `06_FP02_CONTRACT/FP02_FINAL_IMPLEMENTATION_CONTRACT_v2_CANDIDATE.md`
- `07_ACCEPTANCE_TESTS/FP02_ACCEPTANCE_TEST_CONTRACT_v2.md`
- `08_CHANGE_CONTROL/CCR_STATUS_REGISTER.md`
- `09_SECURITY/FP02_SECURITY_REVIEW_v2.md`
- `10_VALIDATION/VALIDATION_RESULTS.md`
- `11_MANIFEST/PHASE_5B1_FILE_MANIFEST.sha256`

به‌علاوه این گزارش و به‌روزرسانی‌های `AI_HANDOFF/` (خارج از شمارش بالا).

## فایل‌های تغییرکرده

**هیچ‌کدام در `implementation/`.** اسناد فاز ۵B (`PHASE_5B_FP02_FINAL_DESIGN/`) **نگه‌داشته شدند، بازنویسی/حذف نشدند** — طبق دستور صریح («نسخه‌ی قبلی را بازنویسی یا حذف نکن»). هر سند اصلاحی در فاز ۵B.1 صریحاً اعلام می‌کند کدام سند فاز ۵B را باطل/تصحیح می‌کند.

## فایل‌های حذف‌شده

هیچ.

## کد تولیدی تغییر کرده است؟

**خیر.**

## معماری منجمد تغییر کرده است؟

**خیر.** Drift = ۰.

## قرارداد مشترک تغییر کرده است؟

**خیر.** v1.1 (FROZEN) بدون تغییر.

## Migration ها

**هیچ‌کدام.**

## وابستگی‌های اضافه یا حذف‌شده

**هیچ‌کدام.**

## آزمون‌های اجراشده و نتایج دقیق

| دستور | نتیجه |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | PASS (exit 0) |
| `npx prisma validate` | PASS |
| `npx jest` | PASS — ۱۰ Test Suite، **۷۵/۷۵** تست، بدون تغییر |

## تصمیم‌های گرفته‌شده و سطح اختیار هر تصمیم

| تصمیم | سطح اختیار |
|---|---|
| حذف کامل قاعده‌ی «ادغام OCCURRENCEهای هم‌`situation_key`» | **اصلاح خطای واقعی** — مستقیماً مشتق از نقض ADR-00AC/IC-13 که بازبینی مرکزی یافته بود |
| FP-01 هرگز نباید Candidate را بر پایه‌ی عدم Resolve شواهد رد کند | IMPLEMENTATION DESIGN — مستقیماً از فهرست بسته‌ی IC-13 §۸ (منجمد) مشتق شد |
| محدودسازی ادعای «منبع شواهد همیشه Malino» | تصحیح دامنه‌ی ادعا — از Architecture Fact نادرست به مشاهده‌ی محدود |
| `SituationLookupInterface` به‌عنوان Advisory (نه تضمین یکتایی) | IMPLEMENTATION DESIGN |
| ماتریس اختیار چرخه‌ی حیات per-Feature (به‌جای قاعده‌ی عمومی) | مستندسازی GAP، بدون حدس |
| Orchestration واقعی AC-2 (FP-03 → FP-02، هرگز معکوس) | تصحیح تفسیر از متن منجمد IC-14 §۵/§۱۴ |
| قواعد Projection صرفاً Event-Sourced (جدایی زنجیره‌ی تعامل از کسب‌وکاری) | IMPLEMENTATION DESIGN — شامل یک یافته‌ی جدید (تداخل احتمالی `latest_event_id`) |

**هیچ تصمیمی در سطح FROZEN ARCHITECTURE گرفته یا تغییر داده نشد؛ صفر ACR.**

## یافته‌های باز

- R4 (Evidence Integrity): **OPEN**
- R5-Concurrency/Uniqueness: **OPEN — CONTRACT GAP**، بدون راه‌حل در این فاز
- مرز حریم خصوصی IC-14 برای `evidence_refs`: **OPEN — GAP**، دو گزینه‌ی ایمن ثبت شد اما تصمیم نهایی گرفته نشد
- ماتریس اختیار چرخه‌ی حیات: ۹ از ۱۲ خانه GAP (عمدتاً RETRACTION/Expiry برای F-02/F-03)

## CCR های باز

۲ باز (Evidence Integrity؛ Evidence Namespace v1.2 — اصلاح‌شده)؛ ۱ بسته (Opportunity Identity Lookup — درخواست اصلی برآورده شد).

## ACR های باز

**۰.**

## ریسک‌ها و محدودیت‌ها

امنیت Resolve شواهد هنوز فقط در سطح طراحی است (بدون Connector واقعی)؛ مرز حریم خصوصی Evidence در IC-14 هنوز باز است و پیش از پیاده‌سازی واقعی IC-14 نیازمند تصمیم صریح است؛ Race همزمانی می‌تواند در موارد نادر به دو Opportunity مستقل برای یک وضعیت منجر شود (ریسک کیفیت تجربه، نه امنیت).

## وضعیت دروازه‌ی فاز بعدی

**FP-02 Core Projection + IC-14 read infrastructure: READY.** **Situation Lookup extension: READY به‌صورت Advisory-only، مستقل.** طبق دستور صریح («حتی در صورت READY، FP-02 را اجرا نکن»)، این فاز خودش مجوز شروع پیاده‌سازی نمی‌دهد.

## اقدام پیشنهادی بعدی

منتظر بازبینی مستقل Codex بر اساس این گزارش و ZIP؛ در صورت تأیید، احتمالاً مجوز صریح شروع پیاده‌سازی FP-02 (Core Projection) به‌عنوان دستور بعدی.

## مسیر ZIP

`C:\mlino code\MLINO_PHASE_5B1_FP02_DESIGN_REMEDIATION.zip`

## اندازه‌ی ZIP

۲۷٬۱۵۶ بایت

## SHA-256 فایل ZIP

`1b3e864a1f21ba5cd16d705ceeb24308acf26a9e037b45f6ee88bb6da836d573`

## مسیر Manifest داخلی

`11_MANIFEST/PHASE_5B1_FILE_MANIFEST.sha256` (داخل ZIP) — چک‌سام تک‌تک ۱۱ فایل داخلی.

## فهرست اسناد مهم داخل ZIP

`00_MASTER_REPORT/MLINO_PHASE_5B1_FP02_DESIGN_REMEDIATION_REPORT.md` (گزارش اصلی)، `02_SITUATION_LOOKUP/SITUATION_LOOKUP_AND_CONCURRENCY_CORRECTION.md` (حذف قاعده‌ی ادغام — مهم‌ترین اصلاح)، `05_PROJECTION/FP02_EVENT_SOURCED_PROJECTION_RULES.md`، `06_FP02_CONTRACT/FP02_FINAL_IMPLEMENTATION_CONTRACT_v2_CANDIDATE.md` (قرارداد نهایی نسخه‌ی ۲)، `08_CHANGE_CONTROL/CCR_STATUS_REGISTER.md`.
