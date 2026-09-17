# گزارش G14c-1 — طراحی مصرف‌کنندهٔ export عمومی در V2

## ۱. کار اجراشده

دستور کامل `CODEX-20260918-G14C1-V2-CONSUMER-DESIGN-006` به‌صورت **فقط سند** اجرا شد. سند `mlino2/MLINO_V2_PUBLIC_CONSUMER_DESIGN.md` با وضعیت DRAFT ساخته شد. نسخهٔ کامل دستور پس از تحویل اولیه در پیوست کاربر رسید؛ الزامات دقیق‌تر C1 تا C7 در commit تکمیلی اعمال شدند و نام گزارش با دستور یکسان شد. هیچ پیاده‌سازی V2، راه‌اندازی انتقال artifact یا اتصال V1 انجام نشد.

## ۲. منابع و پیش‌شرط

- Handoff فعال در `origin/main:AI_HANDOFF/HANDOFF_STATE.md`: `HANDOFF-20260918-GUARDIAN-Q8-3-MERGE`؛ G14c1-006 مرحلهٔ مجاز بعدی است.
- review صادرکننده: `AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_Q8_3_LOCAL_MIGRATION_MERGE.md` از `origin/main@25d44e23342082c17cb4959ca45d4f2540e66f7b`؛ SHA-256 بایت‌های `git show`: `09a26d3c9114568774502c7edc0e6c93a2b75efb88575758eaff9d903047d515`.
- متن پایهٔ دامنهٔ G14c-1: بخش ۵ `origin/main:AI_HANDOFF/CLAUDE_REVIEWS/20260917_CLAUDE_REVIEW_Q8_2_IMPLEMENTATION.md`؛ متن کامل نسخهٔ ۰۰۶ در پیوست ارسالی مالک جزئیات بیشتری برای هر C item مشخص کرد.
- `git fetch origin` به علت نبود اتصال GitHub شکست خورد. GW2-P بر مبنای commit موجود اجرا شد: `git cat-file -e 25d44e2^{commit}` → `CAT_FILE_PASS`؛ `git merge-base --is-ancestor 25d44e2 origin/main` → `ANCESTOR_PASS`؛ hash سند pinned با `git show` دقیقاً برابر مقدار بالا. هیچ credential، `git config` یا `safe.directory` تغییر نکرد.
- منابع فنی فقط‌خواندنی: `origin/main` برای قرارداد نهایی و `implementation/public-export/{builder,canonical,signing,cli}.ts`؛ `origin/codex/v2-intent-flow-foundation@f4d326f` برای `App.tsx` و `directory/{contract,validate,loader,BusinessDirectoryService}.ts`.

## ۳. فایل‌های تغییرکرده

1. `mlino2/MLINO_V2_PUBLIC_CONSUMER_DESIGN.md` — سند تازه، DRAFT.
2. همین گزارش — فایل تازه.
3. `mlino2/HANDOFF/HANDOFF_STATE.md` — فقط افزودن ورودی تحویل.

## ۴. فایل‌ها و محیط تغییرنکرده

هیچ کد، آزمون، config، schema، migration، قرارداد FINAL، شاخهٔ V2، پایگاه داده یا container تغییر نکرد. هیچ npm، Prisma، Docker، push، دسترسی به `_PUSH_STAGING` یا عمل روی credential انجام نشد.

## ۵. پوشش C1 تا C8

| الزام | بخش سند | وضعیت |
|---|---|---|
| C1 مسیر خواندن و گزینه‌های انتقال | C1 | انجام شد؛ سه گزینه با تشخیص نسخه، شکست و هزینه؛ یک توصیه، بدون انتخاب مالک |
| C2 بررسی نسخه، trust bundle، کلید و Ed25519 روی canonical bytes | C2 | انجام شد؛ بررسی پیش از cache، رساندن bundle و چرخش/لغو کلید توضیح داده شد |
| C3 TTL، fail-closed و جدایی `stale` امضاشده از freshness | C3 | انجام شد؛ TTL پنج دقیقه پیشنهاد است؛ رفتار کاربر در هر شکست آمده |
| C4 نگاشت فیلدبه‌فیلد v1 به V2 و حذف انتظارهای ناموجود | C4 | انجام شد؛ برای category/floor/building/products/discount_percent یک رفتار توصیه شده؛ لینک توانمندی فقط در همان رکورد |
| C5 جدایی Mock `draft-1` | C5 | انجام شد؛ یک توصیه و هیچ fallback پنهانی |
| C6 cache اتمیک و خواندن‌های در جریان | C6 | انجام شد؛ cache پیشین فقط تا پایان TTL معتبر می‌ماند |
| C7 فهرست آزمون‌های G14c-2 | C7 | انجام شد؛ کلید ناشناس/لغوشده، tampering، انقضا، cache قبلی و دادهٔ قدیمی پوشش داده شد؛ آزمونی اجرا یا نوشته نشد |
| C8 پرسش‌های باز با گزینه و یک توصیه | C8 | انجام شد؛ هیچ پرسشی تصمیم‌گیری نشد |

## ۶. اعتبارسنجی و نتیجه

- هر هشت بخش C1 تا C8 در سند وجود دارد. منابع V1 و V2 با ارجاع مسیر و شمارهٔ خط ذکر شده‌اند.
- `git diff --cached --check` برای commit سند: PASS.
- مستند فقط دربارهٔ طراحی است؛ اجرای آزمون کد طبق دستور لازم و مجاز نبود. بررسی مستند و دامنه جای آن انجام شد.
- SHA-256 **نسخهٔ نهایی** سند از بایت‌های `git show 18f5364:mlino2/MLINO_V2_PUBLIC_CONSUMER_DESIGN.md`: `9222ebd19527771fb314dc10d506c4ff9df5b0df34a788cd878b89821931bd98`.

## ۷. Commit

- `5a3cc98` — افزودن سند طراحی.
- `c8848a8` — تکمیل جزئیات دستور ۰۰۶. گزارش تحویل اولیه با نام تاریخ ۱۷ به نام الزامی تاریخ ۱۸ منتقل شد؛ از دید تغییر نهایی نسبت به base، فقط سه فایل مجاز وجود دارد. ورودی قدیمی Handoff به حکم append-only دست نخورده و با ورودی اصلاحیِ بعدی توضیح داده می‌شود.
- `18f5364` — روشن‌کردن اینکه endpoint محلی به میزبان استقرار مربوط است، نه گوشی کاربر.
- گزارش و ورودی Handoff در commit تحویل جداگانه ثبت می‌شوند؛ فقط commit محلی، بدون push.

## ۸. ریسک‌های باقی‌مانده

- V2 فعلی فقط قالب Mock `draft-1` را اعتبارسنجی می‌کند؛ بدون G14c-2 نمی‌تواند export امضاشدهٔ واقعی را بخواند.
- محل واقعی انتشار artifact، trust bundle و چرخهٔ دریافت هنوز تعیین و راه‌اندازی نشده‌اند. بنابراین هدف پنج‌دقیقه‌ای انتشار withdrawal فعلاً تضمین عملیاتی ندارد.
- browser و V1 باید canonical bytes یکسان بسازند؛ این امر در G14c-2 به بردار آزمون مشترک نیاز دارد.
- cache معتبر قبلی تنها تا پایان TTL می‌تواند در خطای دریافت جدید باقی بماند؛ حذف فوری پس از تعلیق claim در V2 بدون دریافت جدید قابل ادعا نیست.

## ۹. پرسش‌های باز

C8-1 تا C8-5 دربارهٔ محل تحویل، دورهٔ دریافت/TTL، trust bundle، فیلترهای قدیمی و نیاز احتمالی به invalidation فوری در خود سند با گزینه‌ها و توصیه ثبت شده‌اند. هیچ‌کدام در این اجرا تصمیم نشده‌اند.

## ۱۰. گام پیشنهادی و توقف

Architecture Guardian سند DRAFT و این گزارش را بازبینی کند. G14c-2 فقط پس از بازبینی و مجوز جداگانه آغاز شود. این task پس از commit محلی متوقف می‌شود.

من کدکس هستم
