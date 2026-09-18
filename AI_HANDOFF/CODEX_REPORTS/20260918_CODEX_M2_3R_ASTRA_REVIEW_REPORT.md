# گزارش توقف بازبینی مشترک M2-3R

INSTRUCTION_ID: CODEX-20260918-M2-3R-ASTRA-JOINT-REVIEW-001
TARGET_HANDOFF_ID: HANDOFF-20260918-GUARDIAN-M2-3B-REVIEW
CODEX_WORKSTREAM_HANDOFF_ID: HANDOFF-20260918-PUBLIC-EXPORT-OPERATIONS
REVIEW_REFERENCE: d741a84a27656c244ec056ff8d45204e03277761:AI_HANDOFF/CLAUDE_REVIEWS/20260918_CLAUDE_REVIEW_M2_3B_AND_ASTRA_ROUND.md
BASE_COMMIT: f9e48756e28788e4a28bcb48f468bfa2145c65e6
BRANCH: codex/public-export-distribution
STATUS: STOPPED_FOR_FORBIDDEN_PRODUCT_DEFECT

## ۱. کار اجراشده

یک بازتولید تشخیصی بین مؤلفه‌های واقعی V1 و V2 با کلید تصادفی صرفاً آزمایشی اجرا شد. اختلاف پذیرش امضا تأیید شد؛ طبق بخش FORBIDDEN دستور، با یافتن اشکال در کد محصول signing باید گزارش داد و متوقف شد. این تحویل، گزارش توقف است و تکمیل M2-3R نیست. هیچ اصلاح محصولی انجام نشد.

## ۲. منابع و پیش‌شرط‌ها

مرجع تصویب با هش خام git show برابر
`46f4f3e743281e6ffa438d55e09ff383a4ea285c7482acc06d073393cc66ed2f`
خوانده شد. Handoff روی origin/main با هدف دستور برابر بود. پیش از تغییر، هر دو درخت کاری تمیز و HEADها دقیقاً چنین بودند:

- V1: f9e48756e28788e4a28bcb48f468bfa2145c65e6
- V2: be5577477319c3ef1c8709d478c8c30ea14737e6

آخرین fetch با exit 1 و پیام اتصال ناموفق به github.com:443 پس از 54ms شکست خورد. روش GW2-P موفق شد: cat-file exit 0، merge-base --is-ancestor exit 0 و هش مرجع دقیقاً برابر مقدار دستور. خروجی‌ها در `implementation/validation/m2-3r/precondition.log` ثبت شده‌اند. هش با Node execFileSync روی بایت خام git show محاسبه شد، نه با تبدیل متن PowerShell.

منابع محصول: در مبنای V1، signing.ts:37-43 و distribution/distribute.ts:69-108؛ در مبنای V2، verify.ts:11-21 و :39-48 و consumer.ts. متن گردش‌کار CODEX_GOVERNANCE_WORKFLOW.md نیز خوانده شد.

## ۳. فایل‌های تغییریافته

- `implementation/validation/m2-3r/signature-parity.cjs`: بازتولید مستقل، با بارگذاری فایل‌های واقعی TypeScript و تبدیل در حافظه؛ بدون تغییر محصول.
- `implementation/validation/m2-3r/signature-parity.log`: خروجی واقعی فرمان تشخیصی و کد خروج.
- `implementation/validation/m2-3r/precondition.log`: خروجی پیش‌شرط‌ها.
- همین گزارش جدید.
- `mlino2/HANDOFF/HANDOFF_STATE.md`: فقط ورودی افزودنی.

نسخه یکسان اسکریپت و خروجی تشخیص در هر دو شاخه ذخیره شده است.

## ۴. فایل‌ها و محیط تغییریافته‌نشده

کد محصول V1/V2، تست‌های قبلی، nginx، نسخه‌سنج، schema، migration، وابستگی‌ها و پیکربندی تغییر نکردند. هیچ فرمان Docker، اتصال دیتابیس، خواندن credential، دسترسی به _PUSH_STAGING، تغییر git config، merge یا push اجرا نشد. درباره سلامت runtime زنده ادعای بررسی تازه نداریم؛ آن محیط بررسی نشد.

کلید آزمایشی فقط در حافظه ساخته شد. fake protector به‌جای ذخیره private bytes یک token تصادفی در descriptor موقت می‌نویسد؛ داده خصوصی در حافظه نگهداری و در finally صفر می‌شود. پوشه موقت پس از کنترل مرز مسیر حذف شد؛ خروجی این پاک‌سازی در لاگ آمده است.

## ۵. آزمایش اجراشده

فرمان اجراشده از شاخه V1:

```text
node implementation/validation/m2-3r/signature-parity.cjs "C:\Users\galexy\mlino code\public-export-distribution\implementation" "C:\Users\galexy\mlino code\v2-public-export-route\mlino2\app"
```

اسکریپت، generateProtectedKey و createDpapiKeyProvider با fake protector، signEnvelope، canonicalBytes، distributeCurrent و buildV2TrustBundle واقعی را به trustBundleFromBuildJson، FileTransport و PublicExportConsumer واقعی متصل می‌کند. یک رکورد عمومی معتبر بدون Offer/Capability استفاده شده است.

| شاهد دقیق در اسکریپت/لاگ | نتیجه |
| --- | --- |
| CONTROL canonical | امضای V1 معتبر؛ فایل توزیع شد؛ V2 یک رکورد TEST را پذیرفت |
| CONTROLS tamper | تغییر یک بایت نام با PUBLIC_EXPORT_BAD_SIGNATURE رد شد |
| CONTROLS revoked | شناسه لغوشده با PUBLIC_EXPORT_UNKNOWN_OR_REVOKED_KEY رد شد |
| CONTROLS ttl | سن بیشتر از TTL با PUBLIC_EXPORT_EXPIRED_OR_FUTURE رد شد |
| FINDING M2-3R-F1 | متن متفاوت امضا با بایت‌های رمزنگاری یکسان: V1 پذیرفت و توزیع کرد؛ V2 با PUBLIC_EXPORT_SIGNATURE_VALUE رد کرد |

این‌ها assertionهای یک فرمان تشخیصی هستند، نه شمارش suiteهای Jest/Vitest. هیچ شبکه یا دیتابیس در آزمایش استفاده نشد.

## ۶. نتیجه و یافته‌ها

| شناسه | شدت | مؤلفه | شرح | اصلاح و شاهد |
| --- | --- | --- | --- | --- |
| M2-3R-F1 | متوسط، مانع ادامه طبق دستور | V1 signing.ts / مرز توزیع به V2 | V1 شکل غیر canonical از base64url امضای معتبر را می‌پذیرد؛ V2 همان فایل canonical JSON توزیع‌شده را رد می‌کند | اصلاح نشده؛ کد signing ممنوع است. شاهد: assertion پس از تغییر آخرین sextet و خط FINDING در لاگ |
| M2-3R-O1 | ریسک بررسی‌نشده در اجرا | توزیع | readFile در distribute.ts:78 بدون سقف پیش‌خواندن 2,000,000 بایت است | مشاهده ایستا؛ آزمون فایل بزرگ و اصلاح، به دلیل توقف اجرا نشد |
| M2-3R-O2 | ریسک عملیاتی | توزیع/TTL | default maxAgeMs در :75 برابر 300000 و TTL مصرف‌کننده هم 300000 است | زمان‌بندی تغییر نکرد؛ تحلیل و تصمیم نهایی G10 معوق است |
| M2-3R-O3 | نیازمند آزمون | ویندوز | rename در :98 یک بار اجرا می‌شود | آزمون قفل واقعی و retry اجرا نشد؛ هیچ ادعای PASS/SKIP محیطی نداریم |

شرح F1: امضای Ed25519 دارای 64 بایت است و نمایش بدون padding آن 86 نویسه دارد. چهار بیت آخر sextet پایانی استفاده نمی‌شوند. اسکریپت یکی از این بیت‌ها را تغییر می‌دهد و با deepEqual اثبات می‌کند بایت‌های decoded امضا یکسان‌اند. verifyEnvelope فقط regex الفبا را می‌سنجد و Buffer.from آن بیت‌ها را نادیده می‌گیرد. V2 بازتولید canonical متن را هم می‌سنجد و درست رد می‌کند. این شاهد، جعل امضا یا تغییر محتوای امضاشده را اثبات نمی‌کند؛ اختلاف اعتبارسنجی و امکان توزیع فایل غیرقابل‌مصرف را اثبات می‌کند. مسیر معمول signEnvelope متن canonical تولید می‌کند.

کد خروج تشخیص 0 است؛ نتیجه بررسی کلی **متوقف/ناقص** است. هیچ اصلاح failing-then-passing ادعا نمی‌شود.

به علت دستور توقف، سه build و سه اجرای suite هر شاخه، آزمون rename/ACL، junction/symlink/8.3، فایل بزرگ، duplicate JSON/BOM/newline، sessionStorage و چند تب، nginx HEAD/Range و race بازنشر اجرا نشدند. این موارد «اجرانشده» هستند، نه تست‌های skip‌شده. هیچ skip آزمایشی در فرمان تشخیصی وجود نداشت.

fixture پایدار و Vitest/Jest نهایی تولید نشدند؛ بنابراین هش fixture وجود ندارد. نمونه امضاشده و descriptor فقط در پوشه موقت ساخته و پاک شدند. خروجی مشترک قابل بازتولید و هش آن در هر دو شاخه موجود است؛ جایگزین تحویل fixture نهایی محسوب نمی‌شود.

## ۷. commit و هش‌ها

commit محلی شواهد در این شاخه: `8151deb7236a886678570981933715ee2f372dfd`.
commit گزارش و Handoff بعد از آن ساخته می‌شود و شناسه نهایی در پاسخ تحویل اعلام خواهد شد؛ self-hash داخل گزارش ادعا نمی‌شود. هیچ push انجام نشده است.

هش‌های SHA-256 زیر از بایت git show نسخه commit‌شده محاسبه می‌شوند؛ محتوای این سه blob دارای CR=0 است و در هر دو شاخه یکسان است:

| فایل نسبت به پوشه شواهد | SHA-256 |
| --- | --- |
| signature-parity.cjs | a5816832caa4ddd2651747a69afc5d98ebc495f2d4fd3a1fb4d2591794146107 |
| signature-parity.log | d44d38232fba87cc760876e1c40369c5763d490bca665faddf562dca787a69d2 |
| precondition.log | 337e1d643bc14ad5ef50187f9acf65c88ea7d9465b49ecdb16ad38be4a1a4ef1 |

## ۸. ریسک‌های باقی‌مانده

پذیرش کد قبلی توسط Guardian با این یافته تازه کافی برای بستن بازبینی مشترک نیست. باقی دامنه بازبینی هنوز اعتبارسنجی نشده است. تشخیص با transpile در حافظه اجرا شد و جایگزین type-check یا build نیست. وابستگی موجود استفاده شد؛ نصب تازه انجام نشد.

## ۹. پرسش باز

Guardian باید درباره دامنه اصلاح بررسی‌کننده V1 و ادامه M2-3R دستور بدهد. کدکس دامنه ممنوع را خودسرانه باز نمی‌کند و پذیرش سخت‌گیرانه V2 را تضعیف نمی‌کند.

## ۱۰. گام بعدی پیشنهادی

بازبینی همین شاهد و صدور دستور محدود اصلاح/آزمون F1، سپس ادامه اقلام معوق M2-3R. تا آن زمان اجرای کار متوقف است.

من کدکس هستم
