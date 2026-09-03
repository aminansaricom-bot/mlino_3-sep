# گزارش تحویل Claude — Phase 5B.3: تصحیح شکل AC2DecisionPort

## شناسه‌ی فاز/مأموریت

`PHASE_5B3_AC2_PORT_SHAPE_CORRECTION` (اجراشده طبق دستور معتبر Codex: `CODEX-20260815-2302-PHASE5B3`)

## تاریخ و زمان

۲۰۲۶-۰۸-۱۵، ساعت ۲۳:۱۲ (تقریبی، زمان جلسه)

## وضعیت نهایی

**PHASE 5B.3 — FP-02 CONTRACT READY FOR IMPLEMENTATION AUTHORIZATION REVIEW**

## هدف انجام‌شده

اصلاح دو نقص شکلی در `AC2DecisionPort` (فاز ۵B.2): (۱) ورودی تصمیم اکنون شامل `subject_core_entity_refs` و `evidence_refs` هر کاندید است (نه فقط شناسه‌ها) تا Governance بتواند واقعاً Ownership/Consent را ارزیابی کند. (۲) مجوز Evidence از Boolean کلی به `authorized_evidence_refs: EvidenceRef[]` سطح‌مورد تغییر کرد — خروجی نهایی همیشه Intersection دقیق است، بدون امکان تزریق EvidenceRef خارج از Candidate. هم‌چنین ادعای «عدم افشای Existence Oracle» به سطح واقعاً قابل‌پشتیبان (بدون ادعای Timing-Safety) محدود شد. **S1/S2 فاز ۵B.2 و CR-01 تا CR-05/CR-07 فاز ۵B.1 بدون تغییر و بدون بازتحلیل باقی ماندند** — طبق محدوده‌ی صریح دستور (`PORT_DTO_DELTA_ONLY`).

## منابع و Baseline های استفاده‌شده

خروجی‌های `PHASE_5B2_FINAL_SECURITY_CLOSURE/` (هدف این Delta)؛ بدون نیاز به بازخوانی مجدد ADR/IC چون دستور موضوع را دقیق مشخص کرده بود.

## فایل‌های ایجادشده

همه در `C:\mlino code\PHASE_5B3_AC2_PORT_SHAPE_CORRECTION\` (۳ فایل + Manifest، دقیقاً طبق فهرست حداقلی دستور):

- `AC2_DECISION_PORT_FINAL_DELTA.md`
- `ACCEPTANCE_DELTA.md`
- `PHASE_5B3_REPORT.md`
- `FILE_MANIFEST.sha256`

## فایل‌های تغییرکرده

هیچ‌کدام. اسناد فازهای قبلی (۵B، ۵B.1، ۵B.2) نگه‌داشته شدند، بازنویسی نشدند.

## فایل‌های حذف‌شده

هیچ.

## کد تولیدی تغییر کرده است؟

**خیر.** تأیید صریح: جست‌وجوی فایل‌های تغییریافته در `implementation/` (به‌جز `node_modules`) پس از آخرین Manifest فاز ۵B.2 صفر نتیجه داد.

## معماری منجمد / قرارداد مشترک تغییر کرده‌اند؟

**خیر، هیچ‌کدام.** `AC2DecisionPort` (و شکل تصحیح‌شده‌اش) implementation-level است؛ `shared-contracts/types.ts` لمس نشد.

## Migration ها / وابستگی‌ها

هیچ‌کدام.

## آزمون‌های اجراشده و نتایج دقیق

طبق دستور صریح، اعتبارسنجی کامل لازم نبود و انجام نشد؛ فقط عدم تغییر `implementation/` تأیید شد (جست‌وجوی فایل‌های جدیدتر از آخرین Manifest — نتیجه: خالی).

## تصمیم‌های گرفته‌شده و سطح اختیار هر تصمیم

| تصمیم | سطح اختیار |
|---|---|
| افزودن `subject_core_entity_refs`/`evidence_refs` به ورودی Port (`OpportunityAccessCandidate`) | IMPLEMENTATION DESIGN — implementation-level، بدون تغییر Shared Contract |
| تغییر خروجی به `authorized_evidence_refs: EvidenceRef[]` + قاعده‌ی Intersection دقیق | IMPLEMENTATION DESIGN |
| منع تزریق EvidenceRef خارج از Candidate توسط Port | IMPLEMENTATION DESIGN — کنترل صحت داده |
| محدودسازی ادعای Existence Oracle (بدون Timing-Safety) | تصحیح صداقت ادعا — حذف تضمینی که پشتیبانی نداشت |

**هیچ تصمیمی در سطح FROZEN ARCHITECTURE گرفته یا تغییر داده نشد؛ صفر ACR.**

## یافته‌های باز

R4: OPEN (بدون تغییر). R5-Concurrency: OPEN (بدون تغییر). پیاده‌سازی واقعی `AC2DecisionPort` (اتصال به Governance واقعی): هم‌چنان OPEN.

## CCR های باز

بدون تغییر از فاز ۵B.2 (۲ باز، ۱ بسته). این فاز CCR/ACR جدیدی ایجاد نکرد.

## ACR های باز

**۰.**

## ریسک‌ها و محدودیت‌ها

`authorized_evidence_refs: []` پیش‌فرض (تا وجود Policy/Resolver واقعی) یعنی در عمل، تا پیاده‌سازی واقعی Governance، هیچ Evidence‌ای نمایش داده نمی‌شود — محافظه‌کارانه و عمدی. صحت `subject_core_entity_refs` وابسته به رابطه‌ی `EventLog↔CoreEntity` در Projection است (بدون تغییر از فاز ۵B.1).

## وضعیت دروازه‌ی فاز بعدی

بدون تغییر از `FP02_IMPLEMENTATION_SCOPE_GATE.md` (فاز ۵B.2) — این فاز فقط شکل Port را تصحیح کرد، مرزهای آمادگی (Core Projection توصیه‌شده، IC-14 CONDITIONAL تا اتصال واقعی، Situation Lookup Advisory-only، Evidence Resolve/R5-Concurrency خارج از دامنه) بدون تغییر باقی‌ماندند.

## اقدام پیشنهادی بعدی

منتظر بازبینی مستقل Codex؛ در صورت تأیید نهایی این شکل Port، احتمال مجوز صریح شروع پیاده‌سازی مرکزی FP-02.

## مسیر ZIP

`C:\mlino code\MLINO_PHASE_5B3_AC2_PORT_SHAPE_CORRECTION.zip`

## اندازه‌ی ZIP

۵٬۶۴۵ بایت

## SHA-256 فایل ZIP

`ee0af7d125a23127016e4939410bd184cfa213e12313525d82b1fa28d17169ee`

## مسیر Manifest داخلی

`FILE_MANIFEST.sha256` (داخل ZIP، ریشه‌ی بسته) — چک‌سام هر ۳ فایل داخلی.

## فهرست اسناد مهم داخل ZIP

`AC2_DECISION_PORT_FINAL_DELTA.md` (سند اصلی این فاز — شکل نهایی Port)، `ACCEPTANCE_DELTA.md` (۷ تست جدید)، `PHASE_5B3_REPORT.md`.
