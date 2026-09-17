# گزارش اجرای G14b-2: تولیدکنندهٔ خروجی عمومی امضاشده

**Instruction:** `CODEX-20260917-G14B2-PUBLIC-EXPORT-IMPLEMENTATION-001`
**Handoff هدف:** `HANDOFF-20260917-OWNER-APPROVAL-G14B2`
**شاخه:** `codex/v1-public-export`؛ فقط commit محلی، بدون push.
**مبنای شروع:** `9430c226f605d1854d78c0c9a98a9f55a8f3158a`.

## ۱. کار انجام‌شده

تولیدکنندهٔ `mlino.v2.public-business.v1` ساخته شد. محتوای کسب‌وکار فقط از `Publication.publishedContent` می‌آید؛ ردیف‌های زنده فقط برای حذف موارد نامجاز و metadata تازگی استفاده می‌شوند. انتخاب آخرین رخداد با `(occurredAt DESC, id DESC)`، تراکنش read-only با ایزولیشن `RepeatableRead`، canonicalization، امضای Ed25519، CLI با نوشتن موقت و جایگزینی atomic و نگه‌داری دو نسخهٔ معتبر قبلی پیاده شده است. طراحی Q1 تا Q10 با مرجع تصویب مالک به حالت APPROVED درآمد.

## ۲. اسناد مبنا و پیش‌شرط

- `AI_HANDOFF/CLAUDE_REVIEWS/20260917_OWNER_APPROVAL_G14B2_EXPORT_IMPLEMENTATION.md` در `9e7eef64ceee2554caa8295a97b78d716c7e0548`؛ SHA-256 بایت‌های Git: `ace54c4a91dab4f389eff7845498cb7ce9a62db16b94e35f85286a39844a43c9`.
- `mlino2/MLINO_V1_PUBLIC_EXPORT_DESIGN.md` (E1–E9)، `mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md` (DTO نهایی)، و schema/PublicationService موجود.
- `git fetch origin` در sandbox به شبکه نرسید؛ تکرار elevated با خطای مالکیت Git متوقف شد. هیچ تنظیم Git تغییر نکرد. GW2-P: `cat-file` و `merge-base` هر دو exit 0، هش سند دقیقاً برابر مقدار pinned. خروجی‌های هر مرحله در `mlino2/validation/g14b-2/precondition.log` ثبت شده‌اند.

## ۳. فایل‌های تغییرکرده

- تازه: `implementation/public-export/{builder,canonical,signing,cli}.ts` و `implementation/test/public-export/public-export.spec.ts`.
- فقط یک ورودی include در `implementation/tsconfig.json` و یک script در `implementation/package.json`.
- وضعیت/تصمیم‌ها در `mlino2/MLINO_V1_PUBLIC_EXPORT_DESIGN.md`؛ اسکریپت و لاگ‌ها و manifest در `mlino2/validation/g14b-2/`؛ همین گزارش؛ ورودی الحاقی Handoff.

## ۴. فایل‌هایی که تغییر نکردند

`schema.prisma`، همهٔ migrationها، `core/**`، سرویس‌های موجود، `package-lock.json`، Dockerfile، قرارداد نهایی V2 و شاخهٔ V2 دست نخورده‌اند. کلید واقعی، secret، آداپتور متصل به secret store یا فایل artifact عملیاتی در مخزن نیست. هیچ دیتابیس زنده‌ای استفاده نشد.

## ۵. تصمیم‌ها و آزمون شاهد

| تصمیم | محل اجرا / حد این مرحله | آزمون نام‌دار |
|---|---|---|
| Q1 | `signing.ts`: امضای Ed25519 detached و base64url؛ `key_id` در bytes امضا | `Q1 Ed25519 verifies and one-byte tamper fails; key_id is signed, value excluded` |
| Q2 | درگاه `SigningKeyProvider`؛ کلید آزمایشیِ یک‌بارمصرف؛ آداپتور OS secret store باید در استقرار تزریق شود و فعلاً fail-closed است | `Q2 unknown key fails closed and ephemeral keys never enter artifact` |
| Q3 | CLI، جایگزینی atomic، دو artifact معتبر قبلی؛ زمان‌بندی ۶۰ثانیه‌ای هنوز در محیط مالک فعال نشده | `Q3 CLI preserves current on signing failure and writes an artifact outside repository` |
| Q4 | producer خروجی و `stale` امضاشده می‌دهد؛ polling/TTL مصرف‌کننده در G14c است | `Q4 export stale flag is signed and cannot be edited by polling consumer` |
| Q5 | ساعات نامعتبر فقط null و log فقط `INVALID_BUSINESS_HOURS` | `Q5 invalid business_hours becomes null and reports only a reason code` |
| Q6 | شرایط نامعتبر فقط Offer را حذف می‌کند؛ null اصیل مجاز است | `Q6 invalid terms drops only that offer and null terms remains allowed` |
| Q7 | `freshUntil` زنده فقط eligibility/metadata | `Q7 and Q9 live fresh_until is metadata and stale or unconfirmed capability is hidden` |
| Q8 | بیش از یک Profile منتشرشده کل سازمان را با کد و شناسه حذف می‌کند؛ ایندکس جزئی CCR جداست | `Q8 two published profiles omit entire organization with reason code` |
| Q9 | Policy v1: تأیید انسانی و تازگی؛ مدرک اضافی الزام نشده | `Q7 and Q9 live fresh_until is metadata and stale or unconfirmed capability is hidden` |
| Q10 | `as_of` ثابت؛ بایت‌ها ثابت؛ زمان دیگر فقط `generated_at` و امضا را تغییر می‌دهد | `Q10 same data and as_of yield identical bytes; different as_of only changes generated_at and signature` |

آزمون‌های تکمیلی E1، جایگزینی OfferVersion، دروازه‌های lifecycle و اعتبار زمانی، جداسازی tenant، قواعد canonical و اجرای واقعی تراکنش read-only نیز در همان spec نام‌گذاری شده‌اند.

## ۶. آزمون‌ها و نتایج

- `tsc -p tsconfig.json --noEmit`: موفق (`tsc.log`).
- spec متمرکز روی PostgreSQL موقت: **۱۶/۱۶** موفق (`focused.log`).
- مجموعهٔ کامل V1 + Core + public-export، سه بار پیاپی با پایگاه tmpfs تازه روی `127.0.0.1:5499`: **هر بار ۳۰/۳۰ مجموعه و ۳۸۴/۳۸۴ آزمون موفق** (`suite-1.log` تا `suite-3.log`). همهٔ migrationها در هر سه پایگاه موقت اعمال شدند.
- بار CPU هنگام آغاز: **۲۸٪**. هر سه container اختصاصی حذف شدند (`cleanup-1.log` تا `cleanup-3.log`). فهرست containerها و volumeها پیش/پس عیناً یکسان است. لاگ‌ها از URL و گذرواژه پاک شده‌اند.
- در یک اجرای مقدماتی پیش از نسخهٔ نهایی، فیلتر شواهد URL عمومیِ پیام Prisma را رد کرد؛ همان ابزار اصلاح و سه اجرای کامل بالا از نو انجام شدند. لاگ‌های نهایی جایگزین آن اجرای مقدماتی‌اند. فاصلهٔ انتهای سه خط لاگ Prisma نیز بدون دست بردن در نتیجهٔ آزمون پاک شد.

## ۷. commit و هش شواهد

Commit پیاده‌سازی: `607da60`؛ اصلاح قالب لاگ: `b5e1987`. همهٔ SHA-256های فایل‌های منبع تازه، spec، اسکریپت و لاگ‌ها روی **بایت‌های `git show HEAD:<path>`** محاسبه شده و در `mlino2/validation/g14b-2/LF-MANIFEST.txt` آمده‌اند. فهرست کامل:

~~~text
implementation/public-export/builder.ts  ec382b56ceb188c85e12117212205e36975f8dca3e10997c533b7ac5a3dda7d5
implementation/public-export/canonical.ts  2978d6d499c7a4771428bcbe99038051ed0be87a5bf916ffe6636a7665140eb2
implementation/public-export/cli.ts  e942b259f0ee550ae301c57981e6f86e796a27c12fa1c332c1e7432118d9cd48
implementation/public-export/signing.ts  bfec480f47554722acd99594c766ab00819b75497b818b2786339d04917af85e
implementation/test/public-export/public-export.spec.ts  378482229704315677ef95fbd345c8e5163d8a5f1023c9dc3f6a2ff0c9719b5e
mlino2/validation/g14b-2/cleanup-1.log  360ea4569dccbb0a17bb098c3395be159d39bba3affd7fcfc4d480de56717242
mlino2/validation/g14b-2/cleanup-2.log  360ea4569dccbb0a17bb098c3395be159d39bba3affd7fcfc4d480de56717242
mlino2/validation/g14b-2/cleanup-3.log  360ea4569dccbb0a17bb098c3395be159d39bba3affd7fcfc4d480de56717242
mlino2/validation/g14b-2/container-1.log  f24f74fa82ba724cf4648c34ab3a933cc7f09c6c49638f2366a4440a2fe4e900
mlino2/validation/g14b-2/container-2.log  b36cd28730eccb1012959ebf75b899c16fbf32b3fe623b6ddf4ccd5209199d4d
mlino2/validation/g14b-2/container-3.log  0e0231255390d46ac1c8450ba73c750db8008641d8ef9a1e3d49ba45f07d78ed
mlino2/validation/g14b-2/containers-after.log  ea29dd3a1d1b958084168dc6a79410da999e05d2627390251914dd01ab28a133
mlino2/validation/g14b-2/containers-before.log  ea29dd3a1d1b958084168dc6a79410da999e05d2627390251914dd01ab28a133
mlino2/validation/g14b-2/cpu.log  b2758e17362c84b8875a047013cd94d7d3708629bb4a7bb12d7ca6b168c6f864
mlino2/validation/g14b-2/focused.log  714b09065c3f807f502ef784dd9ba6900a19e712e7023987404abb3f273da759
mlino2/validation/g14b-2/head.log  1acd0d6fe1b19a7fcad702d1e9db2f58d82d4be1660db15464fbaa2624427d44
mlino2/validation/g14b-2/migration-1.log  057b8c37e0173e8f8f40a4e98066e221ea1cb9a8f37fe18cfec0b20ca7d59f55
mlino2/validation/g14b-2/migration-2.log  057b8c37e0173e8f8f40a4e98066e221ea1cb9a8f37fe18cfec0b20ca7d59f55
mlino2/validation/g14b-2/migration-3.log  057b8c37e0173e8f8f40a4e98066e221ea1cb9a8f37fe18cfec0b20ca7d59f55
mlino2/validation/g14b-2/precondition.log  9d55e68d22755d3bbc181bf667a6f3ee5cc52ba6da3f850a9733523b74a943cf
mlino2/validation/g14b-2/suite-1.log  b746f384189c77dda736f8ee2cd2029be03e7e09e062f484a3340bb82e23c694
mlino2/validation/g14b-2/suite-2.log  f43cafcbdb6352b11b7dd3a7c03843cd15b2c42fa96e5d5d13496a3b7c51f165
mlino2/validation/g14b-2/suite-3.log  6c9b7f4158ade862ce30d5c939a7ee14d35fae82a86f2a03be2bd78586a5e235
mlino2/validation/g14b-2/tsc.log  1ca4a13146b2891c0e462123ac0cb848f92e6221f18b870a1b78c232d1956c35
mlino2/validation/g14b-2/validate.ps1  d843732964335072a8dd3ec61e42de8ca206e7cba92c952e8cb7b7e84b63579c
mlino2/validation/g14b-2/volumes-after.log  30751f2b93eca8da5d8b67e9af9932912780ed9b98a4765cbbe8b51c3831e58e
mlino2/validation/g14b-2/volumes-before.log  30751f2b93eca8da5d8b67e9af9932912780ed9b98a4765cbbe8b51c3831e58e
~~~

## ۸. ریسک‌های باقی‌مانده

CLI تا زمان تحویل آداپتور واقعی OS secret store و کلید عمومی متناظر اجرا نمی‌شود؛ در نبود آن با خطای ثابت و بدون چاپ secret متوقف می‌شود. job زمان‌بندی‌شده و مصرف‌کنندهٔ V2 در این مرحله راه‌اندازی نشده‌اند. حفاظت Q8 در producer است و جای قید دیتابیس را نمی‌گیرد. نگه‌داری نسخه‌های قبلی صرفاً برای rollback عملیاتی است؛ مصرف‌کننده باید TTL و وضعیت claim را هنگام پذیرش دوباره کنترل کند.

## ۹. پرسش‌های باز

مسیر استقرار آداپتور secret store، دورهٔ چرخش کلید، CCR ایندکس یکتای جزئی Profile، و پیاده‌سازی polling/TTL در G14c جداگانه باز می‌مانند. هیچ‌کدام در این اجرا به‌عنوان تصمیم تازه اتخاذ نشدند.

## ۱۰. گام پیشنهادی

بازبینی Architecture Guardian روی کد، شواهد و همین گزارش؛ سپس تصمیم مالک دربارهٔ ادغام. تا آن زمان هیچ push، راه‌اندازی زمان‌بندی‌شده، اتصال V2 یا گام بعدی انجام نمی‌شود.

من کدکس هستم
