# گزارش — اتصال F-01 (هوش ظرفیت) به SituationLookupInterface

## ۱. مجوز این کار

بدون چرخه‌ی رسمی AI_HANDOFF Codex/ممد — کاربر مستقیماً درخواست کرد: «F-01 رو به Lookup وصل کن». مطابق همان الگوی خودارزیابی/اختیار مستقیم کاربر که در دو گزارش قبلی (`20260903_SELF_REVIEW_FP02_CLAUDE.md`, `20260903_SITUATION_LOOKUP_INTERFACE_REPORT.md`) ثبت شده.

## ۲. وضعیت نهایی

**F-01 اکنون به `SituationLookupInterface` متصل است — Wiring کامل، تست‌شده.**

## ۳. تغییر رفتاری دقیق

پیش از این تغییر، `CapacityDetectorService` در هر چرخه‌ی تشخیص، همیشه یک `event_type:'OCCURRENCE'` جدید ارسال می‌کرد — حتی برای یک وضعیت که قبلاً تشخیص داده شده بود (فقط IC-13/`unique_key` مانع تکرار *دقیقاً یکسان* می‌شد، نه مانع OCCURRENCEهای مستقل برای همان وضعیت با تحلیل کمی متفاوت).

اکنون، پیش از ساخت هر Candidate، سرویس `situationLookup.getSituationState(organization_id, 'opportunity.capacity', situation_key)` را فرا می‌خواند:

- **`found:true` و `state:'ACTIVE'`** → Candidate به‌صورت `AMENDMENT` با `opportunity_correlation_id` هدف (دقیقاً همان Opportunity) ارسال می‌شود. این دقیقاً همان رفتار مصوب در `R5_STABLE_STABLE_SITUATION_IDENTITY_SPEC.md §F-01` است: «Amendment: دیدن مجدد situation_key موجود با تحلیل تغییریافته.»
- **`found:false`، یا `found:true` با `state:'EXPIRED'`** → Candidate به‌صورت `OCCURRENCE` جدید و کاملاً مستقل ارسال می‌شود (یک وضعیت منقضی‌شده که دوباره رخ می‌دهد، طبق CR-03، هرگز با Opportunity قدیمی ادغام نمی‌شود).
- `situation_key` هرگز روی Candidateهای `AMENDMENT` تنظیم نمی‌شود (طبق مشخصات: این فیلد فقط برای `OCCURRENCE` معنا دارد).

**تصمیم واقعی هم‌چنان نزد F-01 باقی می‌ماند** — `SituationLookupService` فقط داده می‌دهد، هرگز خودش `submitEventCandidate` را فرا نمی‌خواند و هیچ تصمیمی نمی‌گیرد (Lookup ≠ تصمیم، طبق CR-04).

## ۴. فایل‌های تغییریافته

| فایل | نوع تغییر | چک‌سام SHA-256 جدید |
|---|---|---|
| `implementation/value-engines/capacity/capacity-detector.service.ts` | افزودن وابستگی تزریقی `SituationLookupInterface` + منطق تصمیم OCCURRENCE/AMENDMENT | `68b54aeacd5c5182bad1e8a7b1d8d269fb68796d52b7203deb22c234fb5c3440` |
| `implementation/test/value-engines/capacity/capacity-detector.spec.ts` | به‌روزرسانی ۷ محل فراخوانی سازنده (تزریق `SituationLookupService` واقعی) + ۳ تست جدید | `e197a8ff163e592cca39b8faf73b654517fb6c700b058ee92368844ccf67bf85` |

هیچ فایل دیگری تغییر نکرد — نه `shared-contracts/types.ts`، نه `prisma/schema.prisma`، نه هیچ Feature دیگری (F-02/F-03/F-04/F-05).

## ۵. الگوی تزریق وابستگی — بدون نقض مرز بین‌Feature

`CapacityDetectorService` سازنده‌اش اکنون `SituationLookupInterface` را می‌پذیرد — دقیقاً مثل الگوی موجود `IC13SubmissionInterface`/`IC14ReadInterface`: بدون Import مستقیم کلاس عینی FP-02 در سطح مصرف (نوع، نه پیاده‌سازی، Import می‌شود)، و مصرف واقعی (`new SituationLookupService()`) فقط در نقطه‌ی Wiring (اینجا: تست‌ها) رخ می‌دهد.

## ۶. سناریوهای تست جدید (۳ تست، همگی روی Postgres واقعی)

- **AMENDMENT روی وضعیت ACTIVE:** دو چرخه‌ی تشخیص متوالی روی همان وضعیت، با بازسازی Projection بین آن‌ها → چرخه‌ی دوم دقیقاً یک `AMENDMENT` تولید می‌کند (نه یک `OCCURRENCE` دوم)، با `amendsEventId` درست هدف‌گیری‌شده.
- **OCCURRENCE جدید روی وضعیت EXPIRED:** همان الگو، اما Projection بعد از انقضا بازسازی می‌شود → چرخه‌ی دوم یک `OCCURRENCE` کاملاً مستقل تولید می‌کند (نه AMENDMENT).
- **ناوردای `situation_key`:** Candidate تولیدشده به‌صورت AMENDMENT هرگز `situation_key` را حمل نمی‌کند.

هفت تست از پیش‌موجود F-01 بدون هیچ تغییر رفتاری، دقیقاً همان‌طور که پیش‌بینی می‌شد، سبز باقی ماندند (چون بدون بازسازی صریح Projection بین چرخه‌ها، Lookup همیشه `found:false` گزارش می‌دهد — دقیقاً همان مسیر قبلی).

## ۷. اجرای کامل مجموعه‌ی تست

```
Test Suites: 13 passed, 13 total
Tests:       118 passed, 118 total
```

(۱۱۵ تست قبلی + ۳ تست جدید — همگی سبز.)

## ۸. یک اشتباه پیدا و رفع‌شده در حین نوشتن تست (نه در کد تولیدی)

دو تست جدید ابتدا با یک خطای `as_of_time` در خودِ تست شکست خوردند (Projection را *بعد* از انقضای Slot بازسازی کرده بودم، نه قبل از آن) — یعنی Lookup به‌درستی `EXPIRED` گزارش می‌داد و کد تولیدی هم به‌درستی یک `OCCURRENCE` جدید می‌ساخت؛ خودِ تست فرضیات اشتباهی داشت. رفع شد با اصلاح `as_of_time` بازسازی به زمانی پیش از انقضا.

## ۹. آنچه عمداً همچنان انجام نشد

- **F-02، F-03 به Lookup وصل نشدند** — فقط F-01، طبق درخواست دقیق کاربر.
- **R5-Concurrency هم‌چنان یک Gap باز است.** دو چرخه‌ی تشخیص هم‌زمان که هر دو Lookup را بدون بازسازی میانی صدا بزنند، هنوز می‌توانند هر دو `found:false` ببینند و هر دو یک OCCURRENCE مستقل ارسال کنند — این رفتار عمداً حفظ شد (Advisory-only، نه یک تضمین اتمیک)، نه یک نقص جدید.

## ۱۰. اقدام بعدی

منتظر تصمیم کاربر.
