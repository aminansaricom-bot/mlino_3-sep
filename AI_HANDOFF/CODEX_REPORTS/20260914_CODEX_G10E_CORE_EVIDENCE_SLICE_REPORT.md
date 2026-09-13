# گزارش تحویل G10E — برش Evidence هسته

## ۱. کار اجراشده

برش G10E طبق دستور `CODEX-20260914-G10E-CORE-EVIDENCE-SLICE-001` اجرا شد. هدف، افزودن سرویس Evidence در هسته، آزمون چرخهٔ ثبت/تأیید/انقضا/پس‌گرفتن، اصلاح آزمون Y1 مربوط به پیوند Capability، و تکمیل بررسی Y2 برای `gate_snapshot.grantId` بود.

## ۲. اسناد و مبناهای استفاده‌شده

- بازبینی pinned در `AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G10D_MERGE_G10E_RELEASE.md`
- طراحی Core و قراردادهای موجود در شاخهٔ مبنا
- سرویس‌های Core موجود برای احراز مجوز، سازمان و Publication
- دستورالعمل‌های ایمنی پایگاه دادهٔ tmpfs و محافظ سراسری آزمون

پیش‌شرط GW2-P نیز اجرا شد: `git fetch origin` به‌دلیل `SEC_E_NO_CREDENTIALS` ناموفق بود؛ وجود commit pinned، ancestor بودن آن نسبت به `origin/main` و SHA-256 بایت‌های `git show` هر سه موفق بودند. هیچ credential، token، تنظیم Git یا credential helper تغییر نکرد.

## ۳. فایل‌های تغییرکرده

- `implementation/core/evidence-service.ts`
- `implementation/core/offer-service.ts`
- `implementation/test/core/g10d-offer.spec.ts`
- `implementation/test/core/g10e-evidence.spec.ts`
- `mlino2/validation/g10e/*`
- این گزارش و ورودی append-only در `mlino2/HANDOFF/HANDOFF_STATE.md`

Commit کد و شواهد: `1b2a2b64570dc53499ecc426fa0a2bfac65ff6aa`.

## ۴. رفتار پیاده‌سازی‌شده

`EvidenceService.record` فقط یک مالک را می‌پذیرد: Capability یا OfferVersion از همان سازمان؛ هر دو ستون جفتی باید هم‌زمان تنظیم شوند. `sourceKind` محدود به مقادیر قرارداد است و confidence باید در بازهٔ صفر تا یک باشد. فیلدهای status، confirmation و زمان ایجاد از ورودی پذیرفته نمی‌شوند.

`confirm` فقط Evidence فعال و تأییدنشده را با مجوز `evidence.confirm` به `HUMAN_CONFIRMED` تبدیل می‌کند و actor سازمانی و زمان تأیید را ثبت می‌کند. حتی Evidence با منبع `AI_INFERRED` خودکار تأیید نمی‌شود. `expire` و `withdraw` فقط از وضعیت فعال انجام می‌شوند و پایانی هستند. طبق S15-A هیچ مسیر به‌روزرسانی محتوای Evidence وجود ندارد.

در `OfferService.unlinkCapability`، نبودن پیوند اکنون به `VALIDATION_FAILED` با پیام دقیق `capability link not found` نگاشت می‌شود. آزمون‌های G10d نیز snapshot مجوز را برای انتشارهای PUBLISHED، WITHDRAWN و هر دو ردیف REPLACED با grant شناسهٔ دقیق بررسی می‌کنند.

## ۵. آزمون‌های G10E

آزمون‌های زیر در `implementation/test/core/g10e-evidence.spec.ts` اجرا شدند:

1. `records evidence for a capability and a published OfferVersion`
2. `requires exactly one same-organization owner`
3. `validates confidence boundaries and source kind`
4. `rejects forbidden fields and creates no row`
5. `confirm requires an active unconfirmed evidence and supports AI_INFERRED only through human confirmation`
6. `expire and withdraw are terminal ACTIVE-only transitions`
7. `S15-A exposes no content update method`
8. `W1 cross-organization and missing permissions are denied`
9. `Y1 missing capability link maps to VALIDATION_FAILED`

## ۶. نتیجهٔ اعتبارسنجی

- Prisma Generate با نسخهٔ 5.22.0: موفق
- استقرار ۶ migration روی PostgreSQL موقت tmpfs در پورت 5499: موفق
- آزمون متمرکز G10E: یک suite و ۹ تست موفق
- آزمون کامل V1 پس از اصلاحات: ۲۷ suite و ۳۴۶ تست موفق
- Build: موفق
- آزمون‌های G10d با assertions جدید Y2: موفق

در اجرای اولیه، دو خطای آزمون شناسایی شد: مسیر تست revoke مستقیماً محدودیت audit را دور می‌زد و ترتیب بررسی unlink برای پیوند ناموجود نادرست بود. هر دو در فایل‌های مجاز اصلاح و سپس کل اعتبارسنجی دوباره اجرا شد؛ نتایج نهایی همین اجرای مجدد هستند.

## ۷. ایمنی محیط

تمام اجراهای پایگاه داده فقط روی کانتینر disposable با tmpfs و پورت 5499 انجام شد. محافظ سراسری و محافظ Core فعال بودند. حجم‌های Docker قبل و بعد یکسان بودند، کانتینر با موفقیت حذف شد و `volume-diff.txt` خالی است. هیچ اتصال یا اجرای آزمونی روی پورت 5435، `mlino-v1-local-db`، `_PUSH_STAGING` یا پایگاه دادهٔ زنده انجام نشد.

## ۸. فایل‌های عمداً تغییرنیافته

`schema.prisma`، migrationها، `types.ts`، `tsconfig`، `setup-env`، `test-db-guard`، Docker، package files، قرارداد HTTP، Adapterها، V2، main و هر فایل خارج از دامنهٔ مجاز تغییر نکردند. dependency جدید اضافه نشد.

## ۹. مانیفست و شواهد

مانیفست LF در `mlino2/validation/g10e/LF-MANIFEST.txt` با بایت‌های `git show` از commit `1b2a2b64570dc53499ecc426fa0a2bfac65ff6aa` ساخته شده و چهار مسیر کدی را پوشش می‌دهد. شواهد خام اجرای migration، آزمون متمرکز، آزمون کامل، volume قبل/بعد و teardown در همان پوشه ثبت شده‌اند.

## ۱۰. وضعیت و گام بعد

وضعیت: **PASS — DELIVERED_AWAITING_GUARDIAN_REVIEW**.

شاخهٔ تحویل `codex/core-g10e-evidence` است. پس از commit گزارش و Push، Codex متوقف می‌شود. گام بعد فقط بازبینی Guardian است؛ هیچ G10f یا ادغام با main خودکار آغاز نمی‌شود.

من کدکس هستم.
