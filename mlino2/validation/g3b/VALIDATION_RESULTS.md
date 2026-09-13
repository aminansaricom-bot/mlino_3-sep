# نتایج G3b

## یافته‌های R-1 تا R-7

| یافته | نتیجه | شاهد |
|---|---|---|
| R-1 — پوشش همه‌ی ستون‌های projection | PASS | T4 برای Profile، Capability و OfferVersion با `P0001` |
| R-2 — تغییرناپذیری پیوندهای OfferVersion | PASS | T7 تا T9؛ INSERT/DELETE منتشرشده رد، INSERT/DELETE پیش‌نویس مجاز، UPDATE رد |
| R-3 — D6=A | PASS | T3 و T6؛ هر فیلد عمومی revision را دقیقاً یک واحد افزایش داد؛ تغییر مستقیم رد شد |
| R-4 — بازنشر revision تازه | PASS | T5 و T6؛ revision بزرگ‌تر پذیرفته و برابر/کوچک‌تر رد شد |
| R-5 — پوشش آزمون | PASS | T1 تا T12 در `logs/full-replay.log` |
| R-6 — نام‌گذاری Membership | PASS | مدل `Membership` و جدول `memberships` در متن استخراج‌شده |
| R-7 — قواعد گذار صریح | PASS | §۴ CCR و آزمون‌های T2، T5، T6 |

## آزمون‌های T1 تا T12

| آزمون | نتیجه |
|---|---|
| T1 — انتشار Profile با revision برابر | PASS |
| T2 — انتشار Profile با revision نابرابر | PASS، `P0001` |
| T3 — افزایش خودکار revision و پنهان‌شدن محتوای stale | PASS |
| T4 — رد تغییر مستقیم سه projection | PASS، `P0001` |
| T5 — بازنشر Profile فقط با revision بزرگ‌تر | PASS |
| T6 — مسیر کامل Capability | PASS |
| T7 — INSERT و DELETE پیوند نسخه‌ی منتشرشده | PASS، `P0001` |
| T8 — INSERT و DELETE پیوند پیش‌نویس | PASS |
| T9 — UPDATE هر پیوند | PASS، `P0001` |
| T10 — DELETE رخداد Publication | PASS، `P0001` |
| T11 — ممیزی Claim/Membership/Grant | PASS، `23514` |
| T12 — مجموعه‌ی دقیق Triggerهای حساس | PASS، ۱۲ از ۱۲ |

## سایر دروازه‌ها

- C1 تا C15: PASS با SQLSTATEهای دقیق
- W1 از مسیر Prisma: PASS با `P2003`
- همه‌ی FKهای ۱۲ مدل Core: `ON DELETE RESTRICT` و `ON UPDATE RESTRICT`
- diff از migrationها و diff مستقل schema: برابر بایت‌به‌بایت پیش از canonicalization خط پایان
- migration نامرتبط: فقط `validation_note`؛ inventory ۱۵۲ خطی پیش و پس یکسان
- fingerprint چهار پوشه‌ی Prisma: پیش و پس دقیقاً یکسان
- teardown: هیچ container، volume یا tooling موقت G3b باقی نماند

CCR همچنان `DRAFT — pending owner approval` است و این نتیجه مجوز تغییر `schema.prisma` یا ساخت migration محصول نیست.

من کدکس هستم.
