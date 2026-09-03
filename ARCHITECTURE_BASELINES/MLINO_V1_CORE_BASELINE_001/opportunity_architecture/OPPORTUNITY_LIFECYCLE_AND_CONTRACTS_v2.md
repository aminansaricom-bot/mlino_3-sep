# سند B (اصلاح‌شده) — چرخه‌ی عمر Opportunity و قراردادهای تعامل

**وضعیت: FREEZE CANDIDATE.** اصلاح‌شده از [OPPORTUNITY_LIFECYCLE_AND_CONTRACTS.md](../OPPORTUNITY_LIFECYCLE_AND_CONTRACTS.md). IC-۱۳/IC-۱۴ اکنون فایل مستقل‌اند؛ این سند دیگر تعریف اصلی آن‌ها را حمل نمی‌کند، فقط به آن‌ها ارجاع می‌دهد.

---

## چرخه‌ی عمر سراسری (وضعیت خود Opportunity) — اصلاح‌شده

```
ACTIVE ──(گذشت expires_at)──► EXPIRED
```

فقط دو حالت. **`SEEN`/`ACKNOWLEDGED`/`DISMISSED` دیگر بخشی از این چرخه‌ی سراسری نیستند** (تصحیح یافته‌ی بازبینی نهایی، سناریوی ۶) — به چرخه‌ی مختص actor زیر منتقل شدند.

## چرخه‌ی عمر مختص actor (رکورد تعامل) — جدید

```
(بدون رکورد) ──► SEEN ──► ACKNOWLEDGED
                    │
                    └────► DISMISSED
```

هر actor، رکورد مستقل خودش را دارد. یک Opportunity با `intended_audience: both` می‌تواند هم‌زمان برای Manager در وضعیت `ACKNOWLEDGED` و برای Receptionist بدون هیچ رکوردی (هنوز ندیده) باشد — هر دو معتبر و مستقل.

**تصریح واژگانی الزامی (طبق بخش ۱۴ فاز ۳C):** `ACKNOWLEDGED` فقط به این معناست: «انسان مربوطه آگاهی خودش از این Opportunity را صریحاً ثبت کرده است.» **`ACKNOWLEDGED` هرگز به‌معنای این‌ها نیست:** اقدامی انجام شده؛ مسئله حل شده؛ نتیجه‌ای حاصل شده؛ اجرایی مجاز شده؛ Recommendationای پذیرفته شده. هیچ برچسب یا مستندسازی نباید این ابهام را دوباره وارد کند (نسخه‌ی قبلی این سند با برچسب مبهم «اقدام/بررسی شد» دقیقاً همین خطا را داشت — اصلاح شد).

**افزودن وضعیت‌های جدید (`RESOLVED`، `ACTIONED`، `COMPLETED`) عمداً و صریحاً خارج از دامنه‌ی V1 Core است**، مگر معماری موجود آن را الزام کند — طبق دستور صریح بخش ۱۴ فاز ۳C.

## قراردادهای تعامل — اکنون فایل مستقل

- **IC-۱۳** (ارسال Event Candidate، شامل هر دو نوع تولیدکننده: Value Engine و رکورد تعامل انسانی): [IC-13_DOMAIN_SIGNAL_PRODUCER_EVENT_CANDIDATE_SUBMISSION.md](IC-13_DOMAIN_SIGNAL_PRODUCER_EVENT_CANDIDATE_SUBMISSION.md)
- **IC-۱۴** (خواندن نقش‌آگاه، شامل ادغام وضعیت سراسری با رکورد تعامل مختص actor): [IC-14_ROLE_AWARE_OPPORTUNITY_DELIVERY.md](IC-14_ROLE_AWARE_OPPORTUNITY_DELIVERY.md)

## اعتبارسنجی سازگاری با INV-1

هر دو چرخه (سراسری و مختص actor) کاملاً Event-Sourced باقی می‌مانند — هیچ ویرایش مستقیم، فقط Occurrence/Amendment. تفکیک به دو چرخه، تعداد Eventها را افزایش می‌دهد اما هیچ Invariant را نقض نمی‌کند.
