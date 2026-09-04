HANDOFF_ID: HANDOFF-20260904-AC2-DUP-HARDENING
AUTHOR: CLAUDE
PHASE: AC2_DUPLICATE_DECISION_HARDENING
STATUS: DELIVERED_AWAITING_INDEPENDENT_REVIEW
EXECUTED_INSTRUCTION_ID: CODEX-20260904-1647-AC2-DUP-HARDENING-AUTH
PREVIOUS_HANDOFF_ID: HANDOFF-20260904-RETRACTION-REVIEW-ACK
CODE_COMMIT_SHA: fe1bdf08df32a76553cff730bc513922258a30f3

---

# گزارش — هاردنینگ F-1: قطعی‌سازی `evaluateAC2FailClosed` در برابر ورودی/خروجی تکراری

## ۱. دستور اجراشده

`INSTRUCTION_ID: CODEX-20260904-1647-AC2-DUP-HARDENING-AUTH`، صادرکننده: ممد (بازبین مستقل، GLM 5.3 Flash)، بر پایه‌ی تصمیم صریح مالک محصول.

**تایید تطبیق قبل از اجرا:** `TARGET_HANDOFF_ID` (`HANDOFF-20260904-RETRACTION-REVIEW-ACK`) و `TARGET_REPORT_SHA256` (`8bb22440fb2c77cbf1f25550dd2b11920813ef38d66f5bb407fbe8858e4f52e9`) با `HANDOFF_STATE.md` وقت اجرا دقیقاً تطبیق داشتند — دستور معتبر بود.

## ۲. تغییرات

**فقط ۱ فایل تولیدی + ۲ فایل تست** (دقیقاً در محدوده‌ی مجاز `AUTHORIZATION_SCOPE: IMPLEMENT_AC2_DUPLICATE_DECISION_HARDENING_ONLY`):

| فایل | نوع | SHA-256 (بعد از تغییر) |
|---|---|---|
| `implementation/foundation/access-decision/ac2-decision-port.ts` | تولیدی | `14ebce3bcf92eb25785c7db6c656db84a85662d1c4a4d41f09ba039c60534597` |
| `implementation/test/foundation/opportunity-read/opportunity-read.spec.ts` | تست | `f31738bbdd25f62a5f3e52d064f7086f17f79f3f451d124ed513fa76630c7e2c` |
| `implementation/test/mocks/fake-ac2-decision-port.ts` | تست (Mock) | `9dc3334d6085e228a4e4c773667023bd3a05bdf2444562d908a2a613127b4af2` |

**توضیح شمول `fake-ac2-decision-port.ts`:** دستور صراحتاً «این فایل + فایل تست مربوطه» را مجاز کرده. برای ساخت سناریوی «Port دو تصمیم برای یک correlation_id برمی‌گرداند»، افزودن یک گزینه‌ی جدید (`duplicateDecisionPair`) به Mock تست لازم بود — دقیقاً همان الگویی که در بازبینی خودم (self-review) برای سناریوی `malformedAuthorizedEvidenceRefs` قبلاً روی همین فایل اعمال شده بود. هیچ فایل foundation/Feature دیگری لمس نشد.

### ۲.۱. منطق پیاده‌سازی‌شده (`evaluateAC2FailClosed`)

1. **تکرار در ورودی `candidates`:** قبل از هر پردازش دیگر، شمارش `opportunity_correlation_id` در کل آرایه‌ی ورودی انجام می‌شود؛ هر کاندیدایی که در یک id تکراری سهیم است، **بدون تماس با Port**، مستقیماً deny می‌شود و از پردازش بعدی (فیلتر subject_core_entity_refs، فراخوانی Port) کاملاً حذف می‌گردد.
2. **تکرار در خروجی Port:** بعد از دریافت `raw` از `port.evaluate`، شمارش `opportunity_correlation_id` روی آرایه‌ی خروجی انجام می‌شود؛ هر id که بیش از یک‌بار ظاهر شده، از نگاشت `byId` کاملاً حذف می‌شود (نه اینکه آخرین مقدار override کند). نتیجه: آن کاندیدا در جستجوی `byId.get(...)` چیزی پیدا نمی‌کند و طبق قاعده‌ی از‌پیش‌موجود «کاندیدای گم‌شده از نتیجه» deny می‌شود — یعنی رفتار «دو تصمیم مبهم» با همان مسیر «بدون تصمیم» یکی شده، بدون نیاز به شاخه‌ی جدید در منطق deny.
3. **بدون تغییر در بقیه‌ی ماتریس fail-closed:** throw/رد Promise، خروجی غیرآرایه، کاندیدای گم از نتیجه، `access !== 'allow'`، `subject_core_entity_refs` خالی، فیلتر تزریق Evidence، و مصونیت در برابر `authorized_evidence_refs` غیرآرایه (رفع‌شده در self-review قبلی) — همه عیناً حفظ شدند؛ هیچ‌کدام لمس نشدند.
4. **مستندسازی در کامنت:** دو قاعده‌ی جدید به JSDoc بالای تابع اضافه شد (بخش Guarantees)، دقیقاً طبق بند ۳.a دستور.

## ۳. تست‌ها

**۴ تست رگرسیون جدید** (بیش از حداقل ۳ الزامی) در `test/foundation/opportunity-read/opportunity-read.spec.ts`، Suite جدید `AC-2 duplicate-decision hardening (F-1)`:

1. Port دو تصمیم `allow`+`allow` برای یک `opportunity_correlation_id` برمی‌گرداند → کاندیدا deny، هیچ Evidence افشا نمی‌شود.
2. Port `allow` سپس `deny` برمی‌گرداند (یک ترتیب) → deny.
3. Port `deny` سپس `allow` برمی‌گرداند (ترتیب معکوس) → deny — اثبات می‌کند نتیجه مستقل از ترتیب است (نه دو تست در یک `it`، بلکه دو `it` جدا برای وضوح گزارش خطا).
4. آرایه‌ی ورودی `candidates` با دو آیتم هم‌`opportunity_correlation_id` (فراخوانی مستقیم `evaluateAC2FailClosed`، نه از مسیر DB واقعی — چون سازنده‌ی واقعی کاندیدا هرگز چنین ورودی‌ای تولید نمی‌کند) → هر دو مورد deny، و `port.calls.length === 0` (هرگز به Port فرستاده نشدند).

### ۳.۱. نتایج اجرا

```
npx tsc --noEmit          → تمیز، بدون خطا (Exit 0)
npm test                  → Test Suites: 13 passed, 13 total
                             Tests:       130 passed, 130 total   (126 قبلی + 4 جدید، صفر Regression)
                             یک اجرا، بدون Retry، روی Postgres واقعی (docker container mlino-v1-local-db)
```

## ۴. اثبات Drift صفر — دو فایل منجمد

| فایل | SHA-256 (بعد از این تغییر) | SHA-256 مرجع (از بازبینی RETRACTION) |
|---|---|---|
| `shared-contracts/types.ts` | `35d218065f9829f2d9c258d082ba6a2fd48588c573a44f722d35fad6dcb76296` | `35d21806...` |
| `prisma/schema.prisma` | `84d138c2222647521f981afefc69944b87b6d2b091cc0f3747e2d0599f37eff0` | `84d138c2...` |

دقیقاً منطبق — **صفر Drift.**

## ۵. بررسی ممنوعیت‌ها

- `shared-contracts/types.ts` / `prisma/schema.prisma`: لمس نشد (بخش ۴ بالا).
- سایر فایل‌های foundation، Features، `SituationLookupInterface`، `jest.config.js`: `git diff --stat` روی Commit کد فقط همان ۳ فایل بخش ۲ را نشان می‌دهد — چیز دیگری تغییر نکرد.
- Import بین‌Featureای / دسترسی Prisma خارج از `foundation/`: بررسی مستقیم — `ac2-decision-port.ts` اصلاً `prisma` را import نمی‌کند (بدون تغییر از قبل)؛ `grep` روی الگوی import بین‌Featureای در `foundation/access-decision/` چیزی برنگرداند.
- تناقض با معماری منجمد یا قرارداد مشترک: مشاهده نشد — این یک هاردنینگ خالص داخلی تابع، بدون تغییر شکل `AC2Decision`/`OpportunityAccessCandidate` یا هیچ نوع Shared Contract. نیازی به CCR/ACR نبود.

## ۶. Commit کد (Evidence)

طبق الگوی دو-Commit: کد+تست ابتدا جداگانه Commit و Push شد تا Hash واقعی به‌دست آید:

```
fe1bdf08df32a76553cff730bc513922258a30f3
"F-1 hardening: evaluateAC2FailClosed denies duplicate-correlation-id decisions/candidates deterministically"
```

**نکته:** بین آخرین Push من و این پاس، موجی (V2) یک تحویل مستقل (`b4a5d5a` — «mlino2 Phase 1: business directory + Leaflet map UI») روی `origin/main` گذاشته بود؛ تماساً داخل `mlino2/` بود، هیچ فایل V1 را لمس نکرد. Commit کد این پاس با `git rebase origin/main` روی آن سوار شد — بدون Conflict (فایل‌های کاملاً غیرهمپوشان).

این گزارش خودش در یک Commit دوم و جداگانه (بعد از این پاس) Push می‌شود؛ Hash آن Commit مستقیماً در پاسخ نهایی به کاربر گزارش می‌شود، نه داخل این فایل (چون این فایل نمی‌تواند Hash خودش را از پیش بداند).

## ۷. وضعیت

**تحویل کامل — منتظر بازبینی مستقل ممد.** هیچ فاز جدیدی شروع نشد. R4 (BLOCKED)، R5-Concurrency (OPEN عمدی)، Adapter واقعی AC-2، RETRACTION برای F-01/F-03 — همگی خارج از دامنه‌ی این پاس، بدون تغییر.

## ۸. اقدام بعدی

**متوقف می‌شوم** — طبق شرط توقف صریح دستور (بند ۵.۵). منتظر بازبینی مستقل ممد و/یا تصمیم بعدی مالک محصول.
