# برنامه‌ی اجرای MVP ملینو V2

**وضعیت:** `READY_FOR_IMPLEMENTATION`  
**نوع خروجی:** برنامه‌ی اجرا؛ بدون تغییر کد تولیدی  
**شاخه‌ی مبنا:** `codex/v2-intent-flow-foundation`  
**Commit مبنا:** `e28cc4549d586ffb99d710221cc05a418730176c`

## ۱. هدف MVP

این MVP باید یک مسیر کامل، قابل نمایش و قابل آزمون بسازد:

```text
نیاز کاربر
  ↓
گفت‌وگو با دستیار و تکمیل زمینه
  ↓
تفسیر و تأیید یک Revision مشخص از Intent
  ↓
Matching روی اطلاعات منتشرشده‌ی کسب‌وکار
  ↓
نمایش تجربه‌ی پیشنهادی
  ↓
مشاهده‌ی جزئیات کسب‌وکار
```

MVP باید نشان دهد MLINO چگونه یک نیاز صریح را به نتیجه‌ای قابل توضیح و مبتنی بر شواهد تبدیل می‌کند. این نسخه مسیر نمایشی و محلی محصول است و ادعای اتصال عملیاتی به V1، داده‌ی تولیدی یا حافظه‌ی بلندمدت ندارد.

## ۲. وضعیت موجود و مبنای اجرا

| بخش | وضعیت فعلی | تصمیم اجرایی |
|---|---|---|
| Core Foundation | چرخه‌ی Permission، Consent، Session و Visibility موجود است | حفظ و تکمیل از طریق قراردادهای محدود؛ بدون ادغام منطق UI در Core |
| Assistant Foundation | پوسته‌ی دستیار و کنترل‌های جلسه موجود است | مبنای تعامل MVP باقی می‌ماند |
| Intent Flow Foundation | چرخه‌ی هفت‌حالته، Revision و تأیید Revision مشخص موجود است | بدون بازطراحی، به Context و Orchestration متصل می‌شود |
| Matching مجاز | در Foundation فعلی `canMatch` همچنان `false` است | فقط پس از عبور از تمام Gateهای MVP، مجوز محدود یک درخواست Matching ساخته می‌شود |
| Directory آزمایشی | قرارداد، Loader، Validation و Dataset محلی موجود است | پشت یک Adapter فقط‌خواندنی V1 Mock قرار می‌گیرد |
| Matching قدیمی | Parser و MatchingService قدیمی موجودند و به Directory و Score متصل‌اند | به‌صورت کامل وارد مسیر حاکم‌شده‌ی MVP نمی‌شوند؛ فقط اجزای خالص و سازگار پس از بررسی قابل استفاده‌اند |
| Experience و Business UI | کارت، Bottom Sheet و جزئیات در UI فعلی وجود دارند | ظاهر قابل استفاده است، اما مسیر MVP باید مستقل از Side Effectهای ذخیره‌سازی محلی باشد |
| آزمون مبنا | آخرین تحویل Foundation تعداد ۲۰۱ آزمون موفق، TypeScript موفق و Build موفق ثبت کرده است | در Phase 0 دوباره روی مبنای نهایی اجرا و ثبت می‌شود |

فایل‌های فیزیکی ADR-0001 تا ADR-0012 در این Checkout پیدا نشدند. تصمیم‌های تأییدشده‌ی مالک در دستور حاضر و اسناد معماری موجود، مرجع این برنامه هستند. Phase 0 فقط محل و Revision دقیق اسناد مصوب را برای قابلیت ردیابی ثبت می‌کند و هیچ تصمیم معماری را باز نمی‌کند.

## ۳. محدوده‌ی MVP

### داخل محدوده

#### MLINO V2

- Assistant Shell
- Intent Flow
- Context Handling صریح و تحت کنترل کاربر
- Matching Interface و پیاده‌سازی حداقلی Matching
- Experience Rendering
- Business Details UI

#### V1 Mock

- Business Profile آزمایشی
- Capability منتشرشده‌ی آزمایشی
- Offer منتشرشده‌ی آزمایشی
- Evidence آزمایشی و قابل ردیابی
- Published Business Information آزمایشی

V1 Mock یک Adapter در سمت V2 برای شبیه‌سازی قرارداد فقط‌خواندنی V1 است. این Adapter مالک حقیقت کسب‌وکار نیست، V1 را تغییر نمی‌دهد و داده‌ی آزمایشی را با برچسب روشن نمایش می‌دهد.

### خارج از محدوده

- اتصال‌های واقعی Production
- Billing
- Marketplace
- AR
- Virtual Storefront
- CRM
- داده‌ی شخصی مشتری
- موتور رزرو واقعی
- یادگیری بین کسب‌وکارها
- LLM خارجی
- Persistence یا حافظه‌ی بلندمدت
- تغییر قراردادها یا داده‌های V1

وجود قابلیت‌های خارج از محدوده در کد فعلی به معنی حذف آن‌ها نیست؛ مسیر MVP به آن‌ها متصل نمی‌شود.

## ۴. مرزهای غیرقابل نقض

1. Core هیچ ماژول V1 یا V2 مانند Directory، Matching یا UI را Import نمی‌کند.
2. Core مفهوم‌ها، وضعیت‌ها و Gateهای خنثی را نگه می‌دارد؛ V1 مالک داده‌ی Business Profile، Capability، Offer، Evidence و Availability است.
3. V2 حقیقت کسب‌وکار یا Offer جدید تولید نمی‌کند و داده‌ی V1 را تغییر نمی‌دهد.
4. Matching فقط اطلاعات در دسترس و منتشرشده‌ای را مصرف می‌کند که Adapter فقط‌خواندنی ارائه داده است.
5. Recommendation داخلی می‌تواند به Capability معتبر ولی منتشرنشده اتکا کند؛ مسیر کاربرمحور این MVP فقط Capability و Offer منتشرشده را می‌بیند.
6. Authorization به Membership سازمانی وابسته است. Role فقط زمینه‌ی معنایی است و Permission روی Membership اعطا می‌شود. MVP فقط می‌تواند Permission موجود و وضعیت Authorization موجود را اعتبارسنجی و مصرف کند؛ نمی‌تواند Permission، Grant یا اختیار کسب‌وکار ایجاد یا تغییر دهد.
7. هر عملیات ناهمگام به Session Generation، Intent Revision، Context Revision و Source Generation مقید می‌شود؛ نتیجه‌ی قدیمی قابل اعمال نیست.
8. تأیید Intent فقط برای همان Revision معتبر است. اصلاح معنادار، Revision جدید می‌سازد و مجوز قبلی Matching را باطل می‌کند.
9. Preferenceهای ذخیره‌شده‌ی UI فعلی، Like، Viewed یا Hidden وارد Context یا امتیاز Matching نمی‌شوند.
10. نتیجه باید بدون بارگذاری Tile نقشه قابل استفاده باشد.
11. نبود شاهد برای یک شرط الزامی به معنی «پشتیبانی‌نشده» است؛ داده یا قطعیت ساخته نمی‌شود.
12. رتبه‌بندی پولی، Sponsor، Popularity ساختگی و معیار پنهان وارد MVP نمی‌شود.

## ۵. شکل اجرایی مسیر MVP

قراردادهای اجرایی زیر در طول Phaseها ساخته می‌شوند. نام نهایی فایل‌ها هنگام پیاده‌سازی می‌تواند با ساختار فعلی هماهنگ شود، اما مسئولیت هر مرز ثابت می‌ماند.

### Intent و Context

- `ConfirmedIntentSnapshot`: متن، تفسیر، Revision تأییدشده و زمان اعتبار.
- `ContextSnapshot`: محدودیت‌ها و ترجیحات صریح مانند محدوده، شعاع، دسته، خدمت، زمان و طبقه.
- هر تغییر مؤثر بر معنی درخواست، Intent یا Context Revision جدید می‌سازد و Matching قبلی را باطل می‌کند.
- اگر تغییر معنادار Context بر Intent یا Matching اثر بگذارد، نتیجه‌ی Matching قبلی فوراً نامعتبر می‌شود و باید با Context جاری دوباره ارزیابی شود؛ نتیجه‌ی قدیمی حق ادامه، نمایش یا انتخاب ندارد.
- Context از GPS پنهان، حافظه‌ی بلندمدت یا داده‌ی شخصی استنتاج نمی‌شود.

### V1 Mock Business Port

- یک Port فقط‌خواندنی برای خواندن Business Profile و اطلاعات منتشرشده تعریف می‌شود.
- Adapter داده‌ی موجود Directory آزمایشی را به خروجی محدود Port تبدیل می‌کند.
- فیلدهای فاقد منبع معتبر با `unknown` یا «پشتیبانی‌نشده» گزارش می‌شوند.
- Product/Service موجود فقط زمانی Capability منتشرشده محسوب می‌شود که Mapping صریح و آزمون‌شده داشته باشد.
- Evidence باید Source، Scope و Freshness روشن داشته باشد؛ Adapter شواهد گم‌شده را جعل نمی‌کند.

### مرز Permission و Authorization

- MVP وضعیت Permission و Authorization موجود را در محدوده‌ی عملیات جاری بررسی و مصرف می‌کند.
- نتیجه‌ی بررسی فقط اجازه‌ی اجرای همان عملیات محلی در همان Session و Scope است؛ Permission Grant یا اختیار جدید ایجاد نمی‌کند.
- Role انتخاب‌شده در UI، Consent، Parser، Context، پاسخ Adapter و نتیجه‌ی Matching منبع Authorization نیستند.
- MVP نمی‌تواند Permission ایجاد کند، Grant بسازد، Membership را تغییر دهد یا Business Authority را ایجاد/اصلاح کند.
- Adapter آزمایشی V1 فقط داده‌ی منتشرشده و مجازِ در دسترس را می‌خواند و هیچ اختیار سازمانی جدیدی صادر نمی‌کند.

### Matching Port

- V2 مالک Matching است.
- ورودی شامل Intent تأییدشده، Context معتبر و Candidateهای فقط‌خواندنی است.
- خروجی شامل حداکثر سه Business Experience، یک گزینه‌ی واجد شرایط برای هر کسب‌وکار، دلایل انتخاب و Evidence Reference است.
- Eligibility از Ordering جدا می‌ماند.
- Composition Root در V2 پیاده‌سازی Matching را Inject می‌کند؛ Core به Matching وابسته نمی‌شود.

### Experience Projection

- نتیجه‌ی Matching به مدل نمایشی محدود تبدیل می‌شود.
- Business Details فقط اطلاعات موجود در همان Snapshot را نمایش می‌دهد.
- بازکردن جزئیات در مسیر MVP، Viewed، Lead، Visit، Outcome یا Interaction پایدار ثبت نمی‌کند.

## ۶. Phase 0 — هم‌ترازی Repository

### هدف

تثبیت یک مبنای واحد و قابل بازتولید پیش از هر تغییر تولیدی.

### وابستگی‌ها

- شاخه و Commit مستقل Intent Foundation
- وضعیت Remote و شاخه‌ی اصلی
- اسناد معماری V2 و ADR-0001 تا ADR-0012

### فایل‌ها و اجزای درگیر

- Git refs و تاریخچه‌ی شاخه
- `mlino2/HANDOFF/20260910_V2_REVIEW/`
- اسناد برنامه، معماری و Roadmap موجود
- کد تولیدی تغییر نمی‌کند

### معیار پذیرش

- Working tree پاک و Commit مبنا دقیق ثبت شده باشد.
- شاخه‌ی اجرا مشخص باشد و `main` تغییر نکند.
- اختلاف شاخه‌ی محلی و Remote تعیین تکلیف و Push شاخه‌ی مستقل تأیید شده باشد.
- محل و Revision اسناد ADR مصوب برای Traceability ثبت شده باشد.
- Diff مبنا ثابت کند فایل‌های V1، Schema، Migration و API تغییر نکرده‌اند.

### آزمون و راستی‌آزمایی

- بررسی Git status، branch، HEAD، remote refs و diff.
- اجرای `npx tsc -b`، `npm test` و `npm run build` روی مبنای نهایی.
- ثبت تعداد دقیق آزمون‌های موفق؛ عدد ۲۰۱ باید دوباره راستی‌آزمایی شود.
- پیش از شروع هر تغییر تولیدی، دسترسی به متن و Revision دقیق ADR-0001 تا ADR-0012 بررسی و ثبت شود.
- پیش از شروع هر تغییر تولیدی، هم‌ترازی برنامه‌ی اجرا و پیاده‌سازی پیشنهادی با تصمیم‌های همان ADRها تأیید شود؛ نبود متن ADR یا ابهام در Revision، خروج از Phase 0 را متوقف می‌کند.

## ۷. Phase 1 — تکمیل Foundation در V2

### هدف

اتصال Assistant Shell و Intent Flow موجود به Context صریح و Orchestration جلسه، بدون دسترسی به داده‌ی کسب‌وکار.

### وابستگی‌ها

- Phase 0 کامل
- Session، Consent، Permission، Visibility و Intent Foundation موجود

### فایل‌ها و اجزای پیشنهادی

- `mlino2/app/src/core/foundation.ts`
- `mlino2/app/src/core/intent.ts`
- `mlino2/app/src/core/context.ts` (جدید)
- `mlino2/app/src/core/orchestration.ts` (جدید یا توسعه‌ی Composition موجود)
- `mlino2/app/src/core/useFoundation.ts`
- `mlino2/app/src/discovery/AssistantFoundation.tsx`
- `mlino2/app/src/discovery/IntentFoundation.tsx`
- `mlino2/app/src/discovery/ContextFoundation.tsx` (جدید)
- آزمون‌های Foundation، Intent، Context و Boundary

### رفتار لازم

- Context فقط از ورودی آگاهانه‌ی کاربر ساخته شود.
- Parser محلی و قطعی می‌تواند Candidate تفسیر بسازد، اما تأیید کاربر را دور نمی‌زند.
- هر تغییر معنادار، Revision جدید ایجاد کند.
- پایان، لغو یا انقضای Session، Intent و Context را Reset کند.
- پنهان‌شدن برنامه Session را Pause کند؛ Visible شدن به‌تنهایی Resume نکند.
- در پایان این Phase هنوز هیچ Query به Directory انجام نشود.

### معیار پذیرش

- Assistant بتواند Intent را جمع‌آوری، اصلاح و برای تأیید نمایش دهد.
- فقط آخرین Revision معتبر قابل تأیید باشد.
- Context قابل مشاهده، قابل اصلاح و Session-only باشد.
- مجوز Matching بدون Consent، Permission، Session فعال، Revision تأییدشده و Context معتبر صادر نشود.
- تغییر معنادار Context بدون تأیید/ارزیابی لازم، اجرای Matching را متوقف کند؛ هیچ نتیجه‌ی قدیمی قابل ادامه یا نمایش نباشد.
- بررسی Permission فقط مصرف Authorization موجود باشد و هیچ Permission، Grant یا Business Authority جدیدی ایجاد نکند.
- هیچ Storage، Fetch، Business import یا LLM خارجی اضافه نشده باشد.

### آزمون‌های لازم

- Transitionهای مجاز و غیرمجاز Intent و Context.
- اصلاح پس از تأیید و ابطال مجوز قبلی.
- Expiry، Cancel، Session End و Visibility.
- stale Revision و stale async token.
- Boundary test برای نبود Storage، Network و Business dependency.

## ۸. Phase 2 — Adapter آزمایشی V1

### هدف

ساخت یک مرز فقط‌خواندنی که داده‌ی آزمایشی موجود را به زبان محدود Business Truth منتشرشده تبدیل کند.

### وابستگی‌ها

- Phase 1 کامل
- قرارداد Directory و Dataset آزمایشی موجود
- فهرست دقیق فیلدهای واقعاً موجود در Dataset

### فایل‌ها و اجزای پیشنهادی

- `mlino2/app/src/discovery/ports/PublishedBusinessReader.ts` (جدید)
- `mlino2/app/src/directory/MockV1BusinessAdapter.ts` (جدید)
- `mlino2/app/src/directory/contract.ts`
- `mlino2/app/src/directory/loader.ts`
- `mlino2/app/src/directory/validate.ts`
- `mlino2/app/src/directory/mock_dataset.json` فقط در صورت اصلاح Fixture مستند و ضروری
- آزمون‌های Contract و Adapter

### معیار پذیرش

- Adapter فقط عملیات خواندن داشته باشد.
- Business Profile، Capability، Offer و Evidence فقط از Fixture موجود استخراج شوند.
- همه‌ی خروجی‌ها Source، Publication Scope و Freshness مشخص داشته باشند.
- داده‌ی آزمایشی در UI و گزارش‌ها صریحاً آزمایشی معرفی شود.
- Capability یا Offer منتشرنشده وارد خروجی V2 نشود.
- نبود Evidence، Availability یا فیلد جزئیات به‌صورت Unsupported/Unknown بازگردد.
- V1، Backend، Schema، API و Database تغییر نکنند.

### آزمون‌های لازم

- اعتبارسنجی Dataset سالم و ناسالم.
- فقط‌خواندنی‌بودن Adapter.
- Mapping قطعی Business/Capability/Offer/Evidence.
- رد رکورد منتشرنشده یا فاقد شاهد الزامی.
- رفتار Freshness و Unknown.
- نبود Import از V1 و نبود Network/Persistence.

## ۹. Phase 3 — Matching MVP

### هدف

انتخاب قطعی و قابل توضیح حداکثر سه تجربه‌ی کسب‌وکار بر اساس Intent تأییدشده، Context صریح و حقیقت منتشرشده.

### وابستگی‌ها

- Phase 1 و Phase 2 کامل
- تعریف دقیق Mandatory Requirement، Eligibility و Ordering

### فایل‌ها و اجزای پیشنهادی

- `mlino2/app/src/discovery/matching/types.ts` (جدید)
- `mlino2/app/src/discovery/matching/eligibility.ts` (جدید)
- `mlino2/app/src/discovery/matching/ordering.ts` (جدید)
- `mlino2/app/src/discovery/matching/matchMvp.ts` (جدید)
- `mlino2/app/src/discovery/matching/MatchingAdapter.ts` (جدید)
- Composition Root سمت V2
- آزمون‌های Matching و Integration

### رفتار لازم

- Eligibility پیش از Ordering اجرا شود.
- یک گزینه باید به‌تنهایی تمام شروط الزامی را پوشش دهد؛ شواهد چند گزینه با هم ترکیب نشوند.
- درخواست صریح تخفیف فقط با Offer فعال و قابل اعمال واجد شرایط است.
- Offer جانبی در درخواست بدون تخفیف می‌تواند توضیح تکمیلی باشد، اما شرط جعلی نمی‌سازد.
- Ranking قطعی، محدود و قابل توضیح باشد.
- MatchingService قدیمی به‌صورت کامل وارد این مسیر نشود، مگر بعد از بررسی تابع‌به‌تابع و اثبات سازگاری.

### معیار پذیرش

- فقط یک Session فعال با Intent Revision تأییدشده می‌تواند Matching را آغاز کند.
- خروجی صفر تا سه کسب‌وکار و حداکثر یک گزینه برای هر کسب‌وکار باشد.
- هر نتیجه دلیل و Evidence Reference معتبر داشته باشد.
- تغییر Intent، Context یا Source Generation نتیجه‌ی در حال اجرا را بی‌اعتبار کند.
- تغییر معنادار Context که بر Intent یا Matching اثر می‌گذارد، نتیجه‌ی قبلی را باطل و ارزیابی مجدد با Context جاری را اجباری کند.
- نتیجه‌ی Stale حتی در صورت کامل‌شدن عملیات قبلی، قابل نمایش، انتخاب یا ادامه نباشد.
- Matching هیچ Business Truth، Offer یا Evidence جدید تولید نکند.
- هیچ معیار پنهان، پولی یا مبتنی بر Preference محلی وارد Ordering نشود.

### آزمون‌های لازم

- شرط اجباری موجود، ناموجود و Unknown.
- Offer فعال، آینده، منقضی، نامعتبر و بدون پایان.
- عدم ترکیب Evidence بین گزینه‌ها.
- ترتیب قطعی در ورودی برابر.
- حذف Duplicate Business و محدودیت سه نتیجه.
- stale token، Revision عوض‌شده و Session منقضی.
- اثبات اینکه Matching فقط Port را می‌بیند و Directory را مستقیم Import نمی‌کند.

## ۱۰. Phase 4 — لایه‌ی Experience

### هدف

نمایش نتیجه‌ی Matching و جزئیات کسب‌وکار در یک مسیر ساده، قابل فهم، RTL و مستقل از Map/AR.

### وابستگی‌ها

- خروجی تثبیت‌شده‌ی Matching MVP
- Projection محدود برای UI

### فایل‌ها و اجزای پیشنهادی

- `mlino2/app/src/discovery/DiscoveryExperiencePanel.tsx` (جدید)
- `mlino2/app/src/discovery/BusinessDetailsView.tsx` (جدید)
- `mlino2/app/src/components/BottomSheet.tsx`
- `mlino2/app/src/components/BusinessCard.tsx`
- Composition در `mlino2/app/src/App.tsx`
- Styleهای اختصاصی همان Components
- آزمون‌های Component، Accessibility و Integration

### حالت‌های لازم

- در حال آماده‌سازی
- نیازمند تأیید Intent
- بدون نتیجه
- نتیجه‌ی منقضی یا باطل‌شده
- خطای داده‌ی آزمایشی
- نتیجه با Evidence و دلیل
- جزئیات با فیلدهای موجود
- فیلد ناموجود یا Unsupported

### معیار پذیرش

- کاربر مسیر Intent تا جزئیات را بدون نقشه طی کند.
- نتیجه‌ها دلیل پیشنهاد و آزمایشی‌بودن منبع را نمایش دهند.
- UI فیلد، Offer، Availability یا ادعای ناموجود نسازد.
- انتخاب و بستن جزئیات در محدوده‌ی Session باقی بماند.
- بازکردن جزئیات هیچ Viewed، Lead، Visit، Outcome یا داده‌ی پایدار ثبت نکند.
- Map و AR موجود حذف نشوند، اما مسیر MVP به آن‌ها وابسته نباشد.

### آزمون‌های لازم

- Rendering همه‌ی Stateها.
- لمس نتیجه و بازشدن جزئیات همان Business ID.
- Keyboard، Focus، Accessible Name و RTL.
- نبود نوشتن در localStorage/sessionStorage/indexedDB.
- Snapshot/Component tests برای Reason و Evidence.
- آزمون مرورگری موبایل و دسکتاپ.

## ۱۱. Phase 5 — سناریوی نمایشی

### هدف

ارائه‌ی یک Demo تکرارپذیر از ابتدا تا انتها با داده‌ی آزمایشی واقعیِ Fixture و بدون وابستگی تولیدی.

### وابستگی‌ها

- تکمیل Phaseهای 0 تا 4
- ممیزی Fixture برای انتخاب سناریویی که تمام ادعاهایش شاهد دارد

### سناریوهای الزامی

1. **مسیر موفق:** کاربر یک نیاز پشتیبانی‌شده را وارد می‌کند، Intent را تأیید می‌کند، Context را می‌بیند، نتیجه می‌گیرد و جزئیات را باز می‌کند.
2. **درخواست تخفیف بدون شاهد کافی:** هیچ مکان فاقد Offer فعال به‌عنوان جایگزین نشان داده نمی‌شود.
3. **بدون نتیجه:** دلیل ساده و امکان اصلاح Intent/Context ارائه می‌شود.
4. **اصلاح پس از تأیید:** Revision قبلی دیگر Matching یا نمایش نتیجه را فعال نمی‌کند.
5. **انقضای جلسه:** Stateهای Intent، Context، Result و Details پاک می‌شوند.

متن دقیق سناریوی موفق پس از ممیزی Phase 2 انتخاب می‌شود تا با Fixture موجود سازگار باشد؛ سناریو نباید برای نمایش بهتر داده یا Offer جدید بسازد.

### فایل‌ها و اجزای پیشنهادی

- Fixtureهای نمایشی محدود و مستند در محدوده‌ی Dataset آزمایشی
- تست Integration مسیر کامل
- تست مرورگری MVP
- راهنمای اجرای Demo در همین برنامه یا مستند تحویل Phase 5

### معیار پذیرش

- Demo در اجرای محلی و Build نهایی تکرارپذیر باشد.
- مسیر اصلی روی موبایل و دسکتاپ کامل شود.
- قطع Tile نقشه Demo را متوقف نکند.
- Console error کنترل‌نشده، درخواست شبکه‌ی تولیدی یا نوشتن در Storage وجود نداشته باشد.
- همه‌ی خروجی‌های کسب‌وکار قابل ردیابی به Fixture و Evidence باشند.

### آزمون‌های لازم

- `npx tsc -b`
- `npm test`
- `npm run build`
- تست مرورگری End-to-End برای پنج سناریوی بالا
- بررسی Network و Storage در مرورگر
- بررسی Responsive و RTL در عرض موبایل و دسکتاپ

## ۱۲. مالکیت مهندسی

| حوزه | مالک اصلی | شرط تحویل |
|---|---|---|
| Core-sensitive code و Lifecycle | Codex | تست State Machine و بازبینی Boundary |
| Foundation و Orchestration | Codex | اثبات fail-closed و stale-result protection |
| Portها و مرز Mock V1 | Codex | قرارداد فقط‌خواندنی و بدون تغییر V1 |
| Eligibility و Matching policy | Codex | تست مبتنی بر Evidence و رفتار قطعی |
| Composition و Integration boundaries | Codex | Core هیچ V2/V1 module را Import نکند |
| UI Componentها و حالت‌های نمایشی | Mamad | کار روی Props/Projection مصوب و بدون Domain rule جدید |
| Styling، RTL و Responsive | Mamad | بررسی موبایل/دسکتاپ و Accessibility |
| مستندات اجرایی | Mamad | بدون تغییر تصمیم‌های معماری |
| Utilityهای کم‌ریسک | Mamad | خالص، محدود و دارای تست |
| تست‌های بدون اثر معماری | Mamad | تست رفتار مصوب، بدون بازتعریف Contract |

هر تغییری که مرز Core، Business Truth، Matching eligibility، Permission یا Lifecycle را لمس کند، پیش از ادغام نیازمند بازبینی Codex است.

## ۱۳. Gateهای تحویل

هر Phase فقط وقتی کامل است که:

- معیار پذیرش آن با شواهد اجرا شده باشد.
- آزمون‌های متمرکز و کل Suite موفق باشند.
- TypeScript و Build موفق باشند.
- Diff ثابت کند V1، Database، Schema و API تغییر نکرده‌اند.
- Mock بودن داده و محدودیت‌های آن در UI روشن باشد.
- هیچ Persistence، LLM خارجی، Business mutation یا دسترسی خارج از Port اضافه نشده باشد.
- `main` فقط پس از Review جداگانه و دستور صریح مالک تغییر کند.

## ۱۴. وضعیت تصمیم اجرا

**A) آماده برای پیاده‌سازی**

Phase 0 باید قبل از تغییر کد انجام شود تا Remote شاخه و محل دقیق ADRهای مصوب ثبت شود. این دو مورد مانع معماری برای شروع برنامه نیستند و هیچ تصمیم مصوبی را باز نمی‌کنند.

من کدکس هستم
