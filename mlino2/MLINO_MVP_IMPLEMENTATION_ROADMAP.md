# نقشهٔ راه پیاده‌سازی MVP ملینو

تاریخ: ۲۰۲۶-۰۹-۱۱  
نقش: MLINO MVP Technical Execution Lead  
مبنای Scope: `MLINO_FIRST_VERTICAL_MVP_SCOPE.md`  
وضعیت: **برنامهٔ اجرای مستنداتی؛ بدون تغییر کد**

این سند Scope تصویب‌شدهٔ MVP اولین Vertical را به توالی اجرای فنی تبدیل می‌کند. دامنه ثابت است: Clinic Module نخستین ماژول کسب‌وکار است، Core و قراردادها عمومی می‌مانند، و V2 فقط دادهٔ منتشرشده و قابل‌ردیابی را مصرف می‌کند.

هیچ کد، Schema، API، Migration، قرارداد منجمد یا ADR در این تحویل تغییر نکرده است.

## ۱. اصول اجرای roadmap

- `ADR-0001` تا `ADR-0012` مرجع معماری هستند؛ هیچ تصمیمی در این roadmap باز نمی‌شود.
- Core سازوکارهای عمومی را مالک است؛ منطق و دادهٔ Clinic در Clinic Module می‌ماند.
- V1 مالک Business Identity، Business Truth، Capability، Offer، Evidence، Recommendation و ActionRecord است.
- V2 مالک Intent experience، Discovery، Matching، Experience و Interaction است.
- V2 به Database یا Event Log V1 دسترسی مستقیم ندارد و دادهٔ V1 را تغییر نمی‌دهد.
- Permission فقط از Membership و Grant موجود مصرف می‌شود؛ هیچ Permission یا اختیار جدیدی در MVP ساخته نمی‌شود.
- Recommendation، Action، Outcome و Evaluation موجودیت‌ها و مراحل جدا هستند.
- هر دادهٔ آزمایشی با برچسب روشن عرضه می‌شود و هیچ Availability، Booking، Visit، Revenue یا Outcome ساختگی تولید نمی‌شود.
- هر تغییر معنادار در Intent یا Context، نتیجهٔ Matching قبلی را باطل و ارزیابی مجدد را اجباری می‌کند.
- پیاده‌سازی از `Reuse → Wrap → Integrate` پیروی می‌کند؛ بازنویسی گسترده و ادغام زودهنگام ممنوع است.

## ۲. پیش‌شرط مشترک پیش از Phase 1

این بخش Phase جدیدی نیست و فقط Gate ورود است:

- مسیر و Revision دقیق ADR-0001 تا ADR-0012 در `docs/architecture/ADR/` قابل دسترسی باشد.
- `MLINO_FIRST_VERTICAL_MVP_SCOPE.md` و این roadmap مبنای مشترک تیم باشند.
- یک سناریوی Clinic از Fixture موجود انتخاب و محدودیت‌های دادهٔ آن ثبت شود.
- معلوم باشد Action نخست مشتری `Open Business Details` است؛ Action عملیاتی کسب‌وکار در این MVP اجرا نمی‌شود.
- وضعیت شاخه، Commit مبنا و نبود تغییر در V1/Schema/API بررسی شود.
- مسیر Legacy Matching برای مسیر جدید قابل فراخوانی نباشد یا Routing آن صریحاً جدا شده باشد.

خروجی این Gate، تأیید آمادگی شروع Phase 1 است؛ هیچ Feature کسب‌وکاری در آن ساخته نمی‌شود.

## ۳. Phase 1 — حداقل Foundation در Core

### هدف

ساخت مسیر عمومی و خنثی از Vertical برای Session، Intent، Context، Permission، Consent، Orchestration و Experience boundary، بدون خواندن دادهٔ کسب‌وکار و بدون فعال‌کردن Matching.

### اجزای درگیر

- Session lifecycle و Session-only state؛
- Identity reference عمومی و بدون منطق Clinic؛
- Membership/Permission consumption؛
- Consent و ترتیب Permission → Consent → Intent؛
- Intent revision، confirmation، correction، cancellation و expiry؛
- Context revision، اعتبارسنجی و invalidation؛
- Orchestration و Routing مسیر جدید؛
- Action boundary برای بررسی اختیار موجود و رد نتیجهٔ stale؛
- Gate صریح `canMatch: false` تا زمان پایان این Phase.

### وابستگی‌ها

- Foundation و Assistant Foundation فعلی؛
- قراردادهای Intent و Session مصوب؛
- ADR-0009 برای Role/Permission؛
- ADR-0010 برای تفکیک اجرای پلتفرم از Authorization؛
- ADR-0011 و ADR-0012 برای Core/Module و Experience/Assistant/Session؛
- نتیجهٔ Gate ورود.

### فایل‌ها و ماژول‌های مورد انتظار

فایل‌های موجود که باید حفظ و در صورت نیاز محدوداً تکمیل شوند:

- `mlino2/app/src/core/foundation.ts`
- `mlino2/app/src/core/foundationEnvironment.ts`
- `mlino2/app/src/core/useFoundation.ts`
- `mlino2/app/src/core/intent.ts`
- `mlino2/app/src/discovery/AssistantFoundation.tsx`
- `mlino2/app/src/discovery/IntentFoundation.tsx`

مرزهای مورد انتظار برای تکمیل:

- `mlino2/app/src/core/context.ts`
- `mlino2/app/src/core/orchestration.ts`
- `mlino2/app/src/discovery/ContextFoundation.tsx`
- تست‌های Core، Context، Orchestration و Boundary در کنار تست‌های موجود.

نام فایل‌های جدید در زمان اجرا باید با ساختار واقعی Checkout تطبیق داده شود؛ این roadmap مالکیت و مرز را تعیین می‌کند، نه Schema یا قرارداد تازه.

### Definition of Done

- Intent و Context فقط در Session جاری نگهداری شوند؛
- تأیید به Revision دقیق Intent و Context متصل باشد؛
- تغییر معنادار، نتیجهٔ قبلی و Tokenهای قدیمی را invalidate کند؛
- Session پایان‌یافته، Intent، Context و نتیجهٔ جاری را reset/dispose کند؛
- Permission فقط بررسی و مصرف شود و هیچ Grant یا Business Authority ساخته نشود؛
- Core هیچ Clinic vocabulary، Business Truth، Capability یا Offer را import یا تولید نکند؛
- مسیر جدید به Legacy Matching، Directory، V1 Database یا Provider خارجی متصل نشود؛
- `canMatch` و دسترسی کسب‌وکار در Foundation همچنان غیرفعال باشد؛
- هیچ Storage پایدار، Transcript، LLM خارجی یا Network task اضافه نشود.

### تست‌های لازم

- Transitionهای Session، Consent و Permission؛
- ایجاد، اصلاح، تأیید، رد، لغو و انقضای Intent؛
- تغییر Context قبل و بعد از تأیید؛
- invalidation نتیجه و رد stale async token؛
- پایان Session، Pause/Resume صریح، visibility و deadline؛
- نبود Import از Clinic/V1 و نبود Storage/Network؛
- اثبات باقی‌ماندن `canMatch: false`.

## ۴. Phase 2 — حداقل Clinic Module

### هدف

ایجاد کوچک‌ترین بستهٔ دامنه‌ای Clinic برای Business Profile، Capability، Offer، Evidence و Publication، بدون انتقال واژگان یا جدول‌های Clinic به Core.

### اجزای درگیر

- Clinic Business Profile با ارجاع به Organization ID متعارف V1؛
- یک خدمت کلینیکی به‌عنوان Capability؛
- Evidence، provenance، confirmation، scope و freshness؛
- Offer متصل به Capability/Option مشخص؛
- اعتبار زمانی `valid_from` و `valid_until`؛
- Publication state برای جداسازی دادهٔ داخلی و قابل‌انتشار؛
- ظرفیت/Workflow محدود Clinic با استفاده از اجزای موجود، بدون ادعای Availability زنده؛
- Read-only Published Business Port برای مصرف بعدی V2.

### وابستگی‌ها

- Phase 1 برای مرز Core و Permission؛
- Organization Identity و Membership موجود در V1؛
- Business Context Phase 1 و قواعد Provenance/Confirmation؛
- قرارداد V1↔V2 پس از تطبیق با دادهٔ واقعی؛
- ADR-0011 برای جدایی ذخیره‌سازی/مالکیت Module؛
- نبود نیاز به Customer Data و R8-a.

### فایل‌ها و ماژول‌های مورد انتظار

مرز منطقی Clinic Module در V1:

- بستهٔ دامنه‌ای Clinic برای Profile، Capability، Offer و Publication؛
- Adapter یا Repository مربوط به دادهٔ Clinic در مرز Module؛
- نگاشت Evidence و Freshness؛
- تست‌های Unit/Contract برای Capability، Offer و Publication.

مرز خواندن V2:

- `mlino2/app/src/directory/contract.ts`
- `mlino2/app/src/directory/loader.ts`
- `mlino2/app/src/directory/validate.ts`
- Port فقط‌خواندنی Published Business Reader در مسیر Discovery؛
- Adapter آزمایشی برای Snapshot، در صورت نیاز و پس از بازبینی فایل‌های موجود.

این Phase نباید `implementation/prisma/schema.prisma` یا Schema Content Studio را تغییر دهد. شکل فیزیکی ذخیره‌سازی Module فقط با تصمیم اجرایی جدا مشخص می‌شود.

### Definition of Done

- یک Clinic با Business ID پایدار و قابل ردیابی وجود داشته باشد؛
- یک Capability با Evidence و وضعیت تأیید/انتشار روشن ثبت شود؛
- یک Offer با Scope مشخص و زمان اعتبار معتبر ثبت شود؛
- Offer آینده، منقضی یا تاریخ‌نامعتبر فعال تلقی نشود؛
- Capability یا Offer منتشرنشده در Published Reader دیده نشود؛
- دادهٔ `CUSTOMER_DATA` به Context یا Published خروجی راه پیدا نکند؛
- دادهٔ آزمایشی و محدودیت‌های آن در خروجی مشخص باشد؛
- Clinic Module به Core وابستهٔ معکوس نشود و Core جدول دامنه‌ای Clinic نداشته باشد؛
- مسیر Capacity فقط Signal/Recommendation داخلی تولید کند و Availability یا رزرو قطعی ادعا نکند.

### تست‌های لازم

- اعتبارسنجی Profile، Capability، Evidence و Offer؛
- مرزهای `valid_from`، `valid_until`، پایان نامحدود، آینده، انقضا و تاریخ نامعتبر؛
- Publication و حذف دادهٔ داخلی از Published Reader؛
- Scope Offer نسبت به Capability/Option؛
- Provenance جدا از Confirmation؛
- رد Customer Data در وضعیت ACCESS_BLOCKED؛
- نبود وابستگی Clinic در Core؛
- فقط‌خواندنی‌بودن Port و Adapter V2.

## ۵. Phase 3 — جریان کسب‌وکار V1

### هدف

ارائهٔ یک حلقهٔ داخلی قابل‌نمایش از Onboarding تا Publish و سپس از Signal/Recommendation به Decision و ActionRecord، با اختیار انسانی و بدون اجرای خودکار بیرونی.

### اجزای درگیر

- Business Onboarding و تکمیل Organization/Business Identity؛
- Membership و Permission موجود برای نمایندهٔ کسب‌وکار؛
- Capability creation؛
- Offer creation؛
- Evidence و Publication؛
- Business Action Loop:

```text
Observation/Signal → Recommendation → Human Decision → ActionRecord
```

- حداقل ActionRecord برای یک اقدام داخلی قابل‌توضیح، نه رزرو، Lead یا تغییر خودکار شیفت؛
- نگه‌داشتن Recommendation، Action، Outcome و Evaluation به‌عنوان مراحل جدا.

### وابستگی‌ها

- Phase 2 و Clinic Module؛
- Recommendation Contract v1.0؛
- ADR-0003 برای قرارداد مشترک Recommendation؛
- ADR-0005 و ADR-0007/0008 برای جدایی چرخهٔ Recommendation و Action؛
- Value Engine ظرفیت موجود، فقط در محدودهٔ سناریوی Clinic؛
- Membership/Permission واقعی یا Fixture صریح و قابل‌تشخیص برای Demo.

### فایل‌ها و ماژول‌های مورد انتظار

- بستهٔ Workflow/Onboarding در مرز V1 یا Clinic Module؛
- سرویس‌های Capability/Offer/Publication؛
- Adapter یا Projection خواندنی Published برای V2؛
- اتصال محدود Signal/Recommendation به ActionRecord؛
- تست‌های Domain، Permission، Publication و Lifecycle؛
- اسناد وضعیت و Scope مرتبط، بدون تغییر ADRهای مصوب.

مسیرهای موجود Opportunity و HTTP Read API فقط در صورت سازگاری با قرارداد این MVP بررسی می‌شوند؛ نباید به‌عنوان Business Directory یا مسیر جدید V2 بازتعبیر شوند.

### Definition of Done

- نمایندهٔ مجاز می‌تواند یک Clinic Demo را به یک Organization متصل کند؛
- Capability و Offer با مالکیت V1/Clinic و Evidence قابل ردیابی ثبت می‌شوند؛
- انتشار فقط پس از شروط تأیید و Permission انجام می‌شود؛
- V2 برای خواندن Published نیازمند دسترسی مستقیم به Database نیست؛
- یک Recommendation داخلی دلیل، Evidence، Target Role، Priority و Expected Impact دارد؛
- Decision انسانی و ActionRecord جدا ثبت می‌شوند؛
- هیچ Action بیرونی بدون Authorization صریح و قرارداد مربوط اجرا نمی‌شود؛
- Outcome یا Evaluation ساختگی ایجاد نمی‌شود؛
- داده‌های داخلی، Customer Data و اطلاعات حساس به Published خروجی راه پیدا نمی‌کنند.

### تست‌های لازم

- Onboarding با Organization ID پایدار و Mapping درست؛
- Permission ناکافی و Role بدون Grant؛
- ساخت و انتشار Capability/Offer؛
- جلوگیری از انتشار دادهٔ تأییدنشده یا منقضی؛
- Recommendation با Evidence و Target Role اجباری؛
- جدایی Recommendation/Decision/ActionRecord؛
- عدم اجرای خودکار Action؛
- تست بازتولیدپذیر سناریوی ظرفیت Clinic؛
- بررسی عدم تغییر قراردادها و فایل‌های منجمد.

## ۶. Phase 4 — تجربهٔ مشتری V2

### هدف

تکمیل مسیر کاربر از Intent تا Discovery و Recommendation و سپس Action Handoff، با نمایش جزئیات Published Clinic و بدون وابستگی به Map یا AR.

### اجزای درگیر

- Assistant Shell؛
- Intent input و confirmation؛
- Context دستی و قابل‌مشاهده؛
- Published Business Reader/Clinic Adapter؛
- Discovery و Candidate retrieval از Port؛
- Matching با Eligibility پیش از Ordering؛
- Reason و Evidence explanation؛
- Business Details؛
- `Open Business Details` به‌عنوان Action Handoff؛
- حالت‌های empty، unsupported، stale، expired، paused و session-ended.

### وابستگی‌ها

- Phase 1 برای Session/Intent/Context/Orchestration؛
- Phase 2 برای Published Clinic data؛
- Phase 3 برای Business Truth و Publication؛
- قرارداد V2 Matching و Experience؛
- جداشدن Routing مسیر جدید از Legacy `App.runSearch` و `MatchingService`؛
- عدم نیاز به اتصال زنده یا LLM خارجی.

### فایل‌ها و ماژول‌های مورد انتظار

اجزای موجود و قابل استفاده:

- `mlino2/app/src/discovery/AssistantFoundation.tsx`
- `mlino2/app/src/discovery/IntentFoundation.tsx`
- `mlino2/app/src/directory/`
- `mlino2/app/src/components/BusinessCard.tsx`
- `mlino2/app/src/components/BottomSheet.tsx`

مرزهای مورد انتظار برای تکمیل:

- `mlino2/app/src/discovery/ContextFoundation.tsx`
- `mlino2/app/src/discovery/ports/PublishedBusinessReader.ts`
- `mlino2/app/src/directory/MockV1BusinessAdapter.ts`
- `mlino2/app/src/discovery/matching/`
- Projection و View مربوط به Business Details در مسیر Task-only؛
- تست‌های Component، Integration، Privacy و Browser.

### Definition of Done

- کاربر Session را آگاهانه شروع می‌کند و Intent را وارد/اصلاح/تأیید می‌کند؛
- Context جاری قابل مشاهده و session-only است؛
- Matching فقط Capability/Offer منتشرشده و دارای Evidence کافی را مصرف می‌کند؛
- شرط اجباری روی یک Capability/Option واحد بررسی می‌شود و Evidenceها بین گزینه‌ها ترکیب نمی‌شوند؛
- Offer فقط در صورت Scope و زمان معتبر مصرف می‌شود؛
- نتیجه صفر تا سه گزینه، قطعی و قابل توضیح است؛
- تغییر Intent/Context/Source، نتیجهٔ قبلی را invalidate می‌کند؛
- Details فقط دادهٔ Published موجود را نشان می‌دهد؛
- `Open Business Details` هیچ Viewed، Lead، Visit، Booking، Outcome یا Storage پایدار ایجاد نمی‌کند؛
- مسیر جدید Legacy Matching، LLM خارجی، Map، AR و Preferenceهای ذخیره‌شده را وارد نمی‌کند؛
- V2 هیچ Business Truth، Capability، Offer یا Permission جدیدی نمی‌سازد.

### تست‌های لازم

- مسیر کامل Intent → Context → Matching → Details؛
- Confirmation وابسته به Revision دقیق؛
- تغییر Context و رد stale result؛
- Eligibility برای Capability/Offer معتبر، آینده، منقضی و نامعتبر؛
- نبود Evidence و پاسخ Unsupported/Empty؛
- عدم ترکیب Evidence بین Optionها؛
- محدودیت صفر تا سه نتیجه و حذف Duplicate Business؛
- نبود فراخوانی Legacy Matching از مسیر جدید؛
- نبود نوشتن Task data در localStorage/sessionStorage/IndexedDB/URL؛
- نبود درخواست Network یا LLM خارجی برای Task؛
- دسترسی‌پذیری، RTL و نمایش موبایل/دسکتاپ.

## ۷. Phase 5 — دموی End-to-End

### هدف

ارائهٔ یک سناریوی تکرارپذیر برای یک Clinic که ارزش MLINO را از ایجاد حقیقت کسب‌وکار تا تجربهٔ کاربر نشان دهد.

### اجزای درگیر

- Clinic Demo Fixture؛
- V1 Onboarding، Capability، Offer و Publish؛
- Business Recommendation/Decision/ActionRecord؛
- V2 Intent، Context، Discovery، Matching و Details؛
- گزارش Reason، Evidence و محدودیت داده؛
- چک‌لیست اجرای Demo و شواهد تست.

### وابستگی‌ها

- تکمیل Definition of Done در Phaseهای 1 تا 4؛
- یک Fixture ثابت و مستند؛
- تست‌های Domain و Integration موفق؛
- Build نهایی و Browser harness موبایل/دسکتاپ؛
- عدم وابستگی به Tile، GPS، Camera، Production API یا Provider خارجی.

### فایل‌ها و ماژول‌های مورد انتظار

- Fixture محدود Clinic در محل مورد تأیید Module؛
- تست End-to-End مسیر کامل؛
- راهنمای اجرای Demo؛
- گزارش شواهد Demo و محدودیت ادعاها؛
- به‌روزرسانی اسناد وضعیت و CHANGELOG پس از تحویل واقعی.

### Definition of Done

سناریوی موفق باید این مسیر را بدون شکستن مرزها اجرا کند:

```text
Business onboarding
 → Organization identity
 → Capability creation
 → Offer creation
 → Publish
 → Customer intent
 → Context confirmation
 → Matching
 → Recommendation explanation
 → Open Business Details
```

همچنین باید این رفتارها قابل نمایش باشند:

- نبود نتیجه به‌علت Capability/Offer ناکافی؛
- رد Offer آینده یا منقضی؛
- رد نتیجهٔ stale پس از اصلاح Intent/Context؛
- رد عملیات با Permission ناکافی؛
- پایان Session و پاک‌شدن دادهٔ جاری؛
- نمایش صریح آزمایشی‌بودن داده؛
- توضیح اینکه دمو اتصال Business Capability به Customer Intent را نشان می‌دهد، نه درآمد، رزرو، مراجعه یا موفقیت درمان.

### تست‌های لازم

- تست End-to-End سناریوی موفق؛
- سناریوی بدون نتیجه و دادهٔ ناکافی؛
- سناریوی Offer آینده/منقضی؛
- سناریوی اصلاح Intent و stale result؛
- Session expiry و disposal؛
- Permission/Consent failure؛
- `npx tsc -b`؛
- `npm test`؛
- `npm run build`؛
- تست مرورگری موبایل و دسکتاپ؛
- بررسی Network، Storage و Console؛
- بررسی RTL و دسترسی‌پذیری.

## ۸. ترتیب تحویل و Gateها

هر Phase باید جداگانه تحویل، تست و بازبینی شود:

```text
Gate مبنا
   ↓
Phase 1: Core Foundation
   ↓
Phase 2: Clinic Module
   ↓
Phase 3: V1 Business Workflow
   ↓
Phase 4: V2 Customer Experience
   ↓
Phase 5: End-to-End Demo
```

هیچ Phase نباید با عبور مخفیانه از مرز Phase قبلی شروع شود. به‌خصوص:

- Phase 1 Matching را فعال نمی‌کند؛
- Phase 2 V2 را به V1 Production متصل نمی‌کند؛
- Phase 3 V2 را به Database/Event Log وصل نمی‌کند؛
- Phase 4 Action عملیاتی کسب‌وکار یا Outcome نمی‌سازد؛
- Phase 5 AR یا Marketplace را به Demo اضافه نمی‌کند.

## ۹. مسئولیت اجرای کار

| حوزه | مالک اصلی | محدودیت |
|---|---|---|
| Core، Session، Intent، Context، Permission و Orchestration | Codex | حساس به معماری و Lifecycle |
| Clinic Module، Capability، Offer، Publication و Action boundary | Codex | بدون نشت دامنه به Core |
| V1 Business Workflow و Published Projection | Codex | V1 مالک حقیقت و اختیار باقی می‌ماند |
| Matching و Eligibility | Codex | فقط روی دادهٔ Published و Evidence |
| UI و Styling تجربهٔ V2 | Mamad | فقط بر اساس Projection مصوب |
| تست و مستندات کم‌ریسک | Mamad با بازبینی Codex | بدون تغییر مرز یا Contract |

## ۱۰. موارد صریحاً خارج از Scope

- AR expansion؛
- Virtual Storefront پیشرفته؛
- Marketplace؛
- Vertical دوم یا Multi-vertical implementation در این MVP؛
- Advanced Learning و Cross-business Learning؛
- Production integrations و Live V1 Connector؛
- Database integration برای Recommendation یا Business Brain؛
- Customer Voice، دادهٔ شخصی، دادهٔ سلامت و R8-a implementation؛
- CRM، Billing، پرداخت، رزرو واقعی، Lead و گفت‌وگوی واقعی؛
- LLM خارجی و حافظهٔ بلندمدت؛
- GPS، Camera و Passive Context؛
- رتبه‌بندی پولی، Popularity ساختگی یا Sponsored placement؛
- اجرای خودکار Action یا ساخت Outcome/Evaluation جعلی.

این موارد حذف نشده‌اند؛ برای این MVP عمداً به Gate و تصمیم مستقل آینده موکول شده‌اند.

## ۱۱. معیار نهایی موفقیت roadmap

Roadmap وقتی کامل اجرا شده است که یک ناظر بتواند بدون توضیح شفاهی دربارهٔ کد، این زنجیره را ببیند و ردیابی کند:

```text
Clinic Business Truth در V1
 → Capability و Offer منتشرشده
 → Intent و Context تأییدشدهٔ مشتری
 → Matching واجد شرایط و قابل توضیح در V2
 → Action Handoff کنترل‌شده
```

و تیم بتواند برای هر حلقه نشان دهد:

- مالک داده کدام مرز است؛
- شاهد و تازگی داده چیست؛
- چه اختیاری مصرف شده است؛
- چه چیزی عمداً اجرا نشده است؛
- چرا نتیجهٔ نمایش‌داده‌شده معتبر یا Unsupported بوده است.

من کدکس هستم
