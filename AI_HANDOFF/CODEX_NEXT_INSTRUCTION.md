INSTRUCTION_ID: CODEX-20260904-1647-AC2-DUP-HARDENING-AUTH
AUTHOR: CODEX
STATUS: EXECUTED
EXECUTED_BY: CLAUDE
EXECUTED_AT: 2026-09-04T17:10:00
RESULTING_HANDOFF_ID: HANDOFF-20260904-AC2-DUP-HARDENING
TARGET_HANDOFF_ID: HANDOFF-20260904-RETRACTION-REVIEW-ACK
TARGET_REPORT_PATH: C:\mlino code\AI_HANDOFF\CLAUDE_REPORTS\20260904_RETRACTION_REVIEW_ACKNOWLEDGEMENT.md
TARGET_REPORT_SHA256: 8bb22440fb2c77cbf1f25550dd2b11920813ef38d66f5bb407fbe8858e4f52e9
TARGET_ZIP_PATH: (none)
TARGET_ZIP_SHA256: (n/a)
REVIEW_COMPLETED_AT: 2026-09-04T16:47:00
AUTHORIZATION_SCOPE: IMPLEMENT_AC2_DUPLICATE_DECISION_HARDENING_ONLY

---

# مجوز فاز بعد: هاردنینگ F-1 — قطعی‌سازی `evaluateAC2FailClosed` در برابر ورودی/خروجی تکراری

**صادرکننده:** ممد (بازبین مستقل، GLM 5.3 Flash) — **بر پایه‌ی تصمیم صریح مالک محصول** (۴ سپتامبر ۲۰۲۶).

## ۱. پیش‌زمینه و مجوز

- این یافته دو بار توسط بازبین ثبت شده (بازبینی پنج تحویل: F-1؛ بازبینی RETRACTION: R-2 اشاره به نوبت آینده): در `foundation/access-decision/ac2-decision-port.ts`، تابع `evaluateAC2FailClosed` از Map برای نگاشت `opportunity_correlation_id` استفاده می‌کند — یعنی در دو حالت، رفتار به‌صورت ضمنی «آخری‌برنده» است، نه قطعی‌مصمم:
  1. Port بیش از یک `AC2Decision` با یک `opportunity_correlation_id` یکسان برگرداند؛
  2. کاندیداهای ورودی شامل دو آیتم با یک `opportunity_correlation_id` یکسان باشند.
- این شکاف امنیتی نیست (fail-closed موجود در برابر خطا/عدم‌تصمیم سالم است)، اما «آخری‌برنده» یک رفتار ضمنی و غیرمصمم است — فلسفه‌ی این تابع fail-closed است، پس هر شکل ناهنجاری باید به deny قطعی ختم شود، نه به overwrite خاموش.
- توجه: مسیر تولیدی فعلی (`buildAccessCandidates`) خروجی Map تولید می‌کند و عملاً ورودی تکراری نمی‌سازد — این هاردنینگ دفاع در عمق برای فراخوان‌های آینده است.

## ۲. محدوده‌ی مجاز (AUTHORIZATION_SCOPE: IMPLEMENT_AC2_DUPLICATE_DECISION_HARDENING_ONLY)

فقط این فایل: `implementation/foundation/access-decision/ac2-decision-port.ts` + فایل تست مربوطه. قواعد هدف:

1. **خروجی تکراری Port:** اگر `port.evaluate` بیش از یک تصمیم برای یک `opportunity_correlation_id` برگرداند، آن کاندیدا **deny** شود (fail-closed قطعی — نه آخری‌برنده). این باید در کامنت تابع هم مستند شود.
2. **ورودی تکراری:** اگر آرایه‌ی `candidates` ورودی شامل دو کاندیدا با یک `opportunity_correlation_id` باشد، **همه‌ی کاندیداهای تکراری deny** شوند (خود پیش‌فرض ورودی = fail-closed).
3. **هیچ تغییر رفتار دیگری در ماتریس fail-closed موجود** (throw/غیرآرایه/کاندیدای گم/allow نامعتبر/subject خالی/فیلتر تزریق Evidence) — همه‌ی آن‌ها عیناً حفظ شوند.

## ۳. ممنوعیت‌های همیشگی

- `shared-contracts/types.ts` و `prisma/schema.prisma`: ممنوع مطلق مگر با CCR رسمی.
- هیچ تغییری در سایر فایل‌های foundation، Features، `SituationLookupInterface`، یا `jest.config.js`.
- هیچ Import بین‌Featureای، هیچ دسترسی Prisma خارج از `foundation/`.

## ۴. تست الزامی (تعریف Done)

1. حداقل سه تست رگرسیون جدید (در `test/foundation/opportunity-read/opportunity-read.spec.ts` یا Suite جدید در همان مسیر):
   - Port دو تصمیم allow با یک correlation_id برمی‌گرداند → کاندیدا deny (و هیچ Evidence افشا نمی‌شود).
   - Port دو تصمیم با یک correlation_id (یکی deny یکی allow، به هر ترتیب) → کاندیدا deny — قطعی، مستقل از ترتیب.
   - کاندیداهای ورودی با correlation_id تکراری → همه‌ی موارد تکراری deny.
2. کل `npm test`: همه‌ی ۱۲۶ تست قبلی بدون Regression + تست‌های جدید — روی Postgres واقعی، یک اجرا، بدون Retry.
3. `npx tsc --noEmit` تمیز.

## ۵. تحویل و گزارش

1. فهرست فایل‌های تغییر + چک‌سام SHA-256 هرکدام در گزارش.
2. اثبات Drift صفر دو فایل منجمد (چک‌سام قبل/بعد) در گزارش.
3. گزارش کامل در `AI_HANDOFF/CLAUDE_REPORTS/` با `HANDOFF_ID` جدید، کپی در `CLAUDE_LATEST_REPORT.md`، به‌روزرسانی `HANDOFF_STATE.md`، سپس Push با Hash واقعی Commit در پاسخ نهایی به کاربر (الگوی دو-Commit پذیرفتنی است).
4. اگر به تناقضی با سطوح ۱ تا ۵ اقتدار رسیدی: متوقف شو، CCR/ACR بنویس — حدس نزن.
5. **شرط توقف:** بعد از گزارش + Push، کاملاً متوقف شو — بازبینی مستقل این فاز را ممد جداگانه انجام می‌دهد.

---
*بازبین: ممد (GLM 5.3 Flash) — R4 (BLOCKED)، Adapter واقعی AC-2، R5-Concurrency، و RETRACTION برای F-01/F-03 همچنان خارج از دامنه و منتظر تصمیم مالک‌اند.*
