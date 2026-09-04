# گزارش — اتصال F-02 و F-03 به SituationLookupInterface

## ۱. مجوز این کار

بدون چرخه‌ی رسمی AI_HANDOFF Codex/ممد — کاربر مستقیماً درخواست کرد: «F-02 و F-03 رو هم به Lookup وصل کن». ادامه‌ی همان الگوی اختیار مستقیم کاربر که در گزارش‌های `20260903_*` و `20260903_F01_SITUATION_LOOKUP_WIRING_REPORT.md` ثبت شده — دقیقاً همان Wiring که برای F-01 انجام شد، اکنون برای دو Feature باقی‌مانده.

## ۲. وضعیت نهایی

**هر سه موتور تشخیص (F-01، F-02، F-03) اکنون به `SituationLookupInterface` متصل‌اند.**

## ۳. یک نکته‌ی معنایی مهم که قبل از پیاده‌سازی بررسی و تایید شد

برخلاف F-01، Payloadهای F-02 و F-03 هیچ‌گاه `expires_at` نداشته‌اند (فقط `evidence_refs`, `materiality_score`, `materiality_basis`, `intended_audience`). این یعنی طبق منطق `compute-projection.ts`، بدون RETRACTION صریح، وضعیت این دو Feature هرگز به‌طور خودکار `EXPIRED` نمی‌شود — همیشه `ACTIVE` می‌ماند. این **دقیقاً رفتار درست و مطابق مشخصات** است، نه یک نقص:

- **F-02:** طبق `R5_STABLE_SITUATION_IDENTITY_SPEC.md §F-02`: «همان appointmentId دوباره پردازش شود ... این AMENDMENT/Retraction طبیعی است.» یک نوبت لغوشده تا وقتی جایگزین نشود، همچنان یک فرصت باز است — طبیعی است که هر تشخیص مجدد، یک AMENDMENT باشد.
- **F-03:** طبق همان سند §F-03: دوره‌ی عدم‌تعامل تا وقتی `lastInteractionAt` واقعاً تغییر نکند (یعنی بیمار تعامل جدیدی نداشته)، همان دوره است — تشخیص مجدد با `materiality_score` بالاتر (چون روزهای بیشتری گذشته) طبیعتاً باید یک AMENDMENT همان وضعیت باشد، نه یک OCCURRENCE جدید.

بنابراین Wiring یکسان با F-01 (بدون هیچ استثنای اضافه) دقیقاً رفتار مصوب را برای هر دو Feature تولید می‌کند.

## ۴. الگوی پیاده‌سازی (عیناً تکرار الگوی F-01)

برای هر دو Feature: پیش از ساخت Candidate، `situationLookup.getSituationState(organizationId, domain_tag, situation_key)` فراخوانی می‌شود؛ `found:true` و `state:'ACTIVE'` → `AMENDMENT` با `opportunity_correlation_id` هدف؛ در غیر این صورت → `OCCURRENCE` مستقل جدید. `situation_key` هرگز روی Candidateهای `AMENDMENT` تنظیم نمی‌شود. تصمیم واقعی هم‌چنان نزد خودِ Value Engine باقی می‌ماند — Lookup فقط داده می‌دهد.

## ۵. فایل‌های تغییریافته

| فایل | نوع تغییر | چک‌سام SHA-256 جدید |
|---|---|---|
| `implementation/value-engines/cancellation/cancellation-detector.service.ts` | افزودن وابستگی `SituationLookupInterface` + منطق OCCURRENCE/AMENDMENT | `129f74755b17bd5fc0e54b660ee30066720c4ee08cde488aa7959a9b8acc5a86` |
| `implementation/test/value-engines/cancellation/cancellation-detector.spec.ts` | به‌روزرسانی ۴ محل فراخوانی + ۲ تست جدید | `256bf86aca4e21d22358976a961069dfaeee96df38727c6bb8edbb504013a8e6` |
| `implementation/value-engines/followup/followup-detector.service.ts` | افزودن وابستگی `SituationLookupInterface` + منطق OCCURRENCE/AMENDMENT | `3f4cfd175defb9d2efc7d9dfa66c847d6c275f36220a771be313c876c5958910` |
| `implementation/test/value-engines/followup/followup-detector.spec.ts` | به‌روزرسانی ۶ محل فراخوانی (جابه‌جایی موقعیت آرگومان) + ۲ تست جدید | `0ba7cb03b55f33a386f5f6085d674e5844380baa1cc7f8faad3240adf459ab58` |

**نکته‌ی فنی:** در `FollowupDetectorService`، `SituationLookupInterface` به‌عنوان آرگومان سوم سازنده (پیش از `thresholdDays`/`now` که پارامترهای اختیاری از پیش‌موجود بودند) اضافه شد — یعنی موقعیت این دو پارامتر اختیاری در فراخوانی‌های تست جابه‌جا شد؛ این یک تغییر Breaking در سطح سازنده است (نه در رفتار عملکردی)، و تمام ۶ محل فراخوانی در تست به‌روزرسانی شدند.

هیچ فایل دیگری تغییر نکرد — نه `shared-contracts/types.ts`، نه `prisma/schema.prisma`، نه F-01/F-04/F-05.

## ۶. سناریوهای تست جدید (۴ تست، همگی روی Postgres واقعی)

- **F-02:** تشخیص مجدد همان نوبت لغوشده‌ی جایگزین‌نشده (بدون بازه‌ی انقضا) → AMENDMENT، نه OCCURRENCE دوم. `appointmentId` متفاوت → همیشه OCCURRENCE مستقل.
- **F-03:** تشخیص مجدد همان دوره‌ی `{patient, lastInteractionAt}` (با گذشت زمان بیشتر، `materiality_score` بالاتر) → AMENDMENT. `lastInteractionAt` جدید (تعامل واقعی جدید بیمار) → همیشه OCCURRENCE مستقل، حتی بعد از بازسازی Projection.

## ۷. اجرای کامل مجموعه‌ی تست

```
Test Suites: 13 passed, 13 total
Tests:       122 passed, 122 total
```

(۱۱۸ تست قبلی + ۴ تست جدید — همگی سبز؛ صفر Regression.)

## ۸. آنچه هنوز انجام نشده

- **F-04، F-05 نیازی به این Wiring ندارند** — این دو مصرف‌کننده‌ی Opportunity هستند (Feed/Briefing)، نه تولیدکننده — منطق OCCURRENCE/AMENDMENT برایشان بی‌معناست.
- **R5-Concurrency هم‌چنان یک Gap باز است** — بدون تغییر، برای هر سه Feature.
- **مسیر RETRACTION** (مثلاً وقتی یک نوبت لغوشده‌ی F-02 بالاخره جایگزین می‌شود) هنوز پیاده‌سازی نشده — نه در این پاس، نه در پاس قبلی. اگر لازم شود، باید جداگانه درخواست شود.

## ۹. Push به GitHub

این تغییرات طبق توافق قبلی به Repository (`aminansaricom-bot/mlino_3-sep`) Push خواهند شد.

## ۱۰. اقدام بعدی

منتظر تصمیم کاربر.
