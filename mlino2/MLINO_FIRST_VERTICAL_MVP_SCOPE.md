# دامنهٔ MVP نخستین Vertical ملینو

تاریخ: ۲۰۲۶-۰۹-۱۱  
نقش: MLINO MVP Execution Lead  
Vertical نخست: **Clinic Module**  
وضعیت سند: **آماده برای پیاده‌سازی محدود**  
رأی نهایی: **A) Ready for implementation**

این سند کوچک‌ترین دامنهٔ قابل‌نمایش برای اثبات ارزش MLINO را مشخص می‌کند. Clinic فقط نخستین ماژول دامنه‌ای است؛ Core، قراردادهای عمومی و مسیرهای توسعه برای Verticalهای بعدی عمومی باقی می‌مانند.

این تحویل فقط Scope و مرز اجراست. هیچ کد، Schema، API، Migration، قرارداد منجمد یا ADR تغییر نکرده است.

## ۱. مبنای تصمیم

این دامنه بر اسناد زیر بنا شده است:

- `MLINO_FIRST_VALUE_PATH_PLAN.md`
- `MLINO_MVP_EXECUTION_PLAN.md`
- `MLINO_PHASE_0_CLOSURE_REPORT.md`
- `docs/architecture/ADR/ADR-0001-v1-as-backbone.md` تا `ADR-0012-experience-assistant-session-boundary.md`

اصول تعیین‌کننده:

- V1 مالک هویت سازمانی، حقیقت کسب‌وکار، Capability، Offer، Evidence، Recommendation، Action، Outcome و Evaluation است.
- V2 مالک Discovery، Matching، Experience و Interaction است و حقیقت کسب‌وکار را ایجاد یا تغییر نمی‌دهد.
- Core سازوکارهای عمومی هویت، Membership، Permission، Consent، Session، Intent، Orchestration و مرز Experience را نگه می‌دارد و مالک موجودیت‌ها و چرخهٔ عمومی Capability، Offer، Evidence و Publication است؛ منطق تخصصی کلینیک در Core قرار نمی‌گیرد.
- Platform اجرا می‌کند، اما Authorization یا Grant جدید ایجاد نمی‌کند.
- Role زمینهٔ کسب‌وکار است و Permission به Membership تعلق دارد.
- Recommendation، Action، Outcome و Evaluation موجودیت‌های جدا باقی می‌مانند.
- Capability معتبر اما منتشرنشده می‌تواند در Recommendation داخلی V1 استفاده شود؛ V2 فقط Capability منتشرشده را می‌خواند.

در این Scope، MLINO یک Platform چندVertical است و Clinic فقط نخستین Module اجرایی آن است. عمومی‌بودن Core باید امکان افزودن Verticalهای بعدی را بدون بازسازی مفاهیم اعتماد، انتشار و Offer حفظ کند.

## ۲. تعریف «کمینهٔ قابل‌نمایش»

دموی نخست باید دو حلقهٔ مرتبط اما مستقل را نشان دهد:

```text
حلقهٔ کسب‌وکار در V1
Onboarding → Identity → Capability → Offer → Publish
                                      ↓
                         Recommendation داخلی
                                      ↓
                              Decision → Action

حلقهٔ مشتری در V2
Intent → Context → Discovery → Matching/Recommendation → Action Handoff
                                                               ↓
                                                مشاهدهٔ جزئیات کسب‌وکار
```

در این MVP، `Action Handoff` سمت مشتری به معنای اقدام کنترل‌شدهٔ `Open Business Details` است. این اقدام به‌تنهایی Visit، Lead، Booking، Purchase یا Outcome نیست.

در سمت V1، `Action` به معنای ActionRecord مستقل است که فقط با اختیار معتبر یک Membership و تأیید انسانی ثبت می‌شود. اجرای واقعی در سیستم بیرونی، رزرو و Outcome قابل‌اندازه‌گیری در این دامنه نیست.

## ۳. اجزای Core

### ۳.۱ Identity

Core باید شناسهٔ پایدار و خنثی از Vertical را برای موارد زیر فراهم کند:

- Organization به‌عنوان هویت متعارف کسب‌وکار؛
- Member/Actor به‌عنوان هویت کاربر داخلی؛
- ارتباط قابل‌ردیابی بین عملیات و Organization؛
- ارجاع به Capability، Offer و Action بدون مالک‌شدن معنای تخصصی آن‌ها.

Core نباید نام، workflow یا فیلد درمانی کلینیک را در مدل عمومی خود وارد کند.

### ۳.۲ Membership و Permission

Membership مرجع مجوز انجام عملیات است. MVP فقط می‌تواند وضعیت موجود Permission/Grant را بررسی و مصرف کند.

MVP نمی‌تواند:

- Permission جدید بسازد؛
- Grant جدید اعطا کند؛
- Membership را تغییر دهد؛
- از Role انتخاب‌شده، متن UI یا پاسخ Assistant اختیار استخراج کند؛
- اختیار Business را به V2 یا ماژول منتقل کند.

برای دمو، Membership و Permission می‌توانند Fixture ازپیش‌تعریف‌شده و صریح باشند؛ Fixture نباید به‌عنوان سیستم Authorization تولیدی معرفی شود.

### ۳.۳ Capability، Offer، Evidence و Publication در Core

این چهار مفهوم، موجودیت‌ها و semantics عمومی Platform هستند و نباید در هر Vertical دوباره ساخته شوند. V1 حقیقت کسب‌وکار و محتوای ثبت‌شده را مالک می‌ماند؛ Core قرارداد، چرخهٔ عمر، اعتبار و Gate عمومی آن‌ها را تعریف و اجرا می‌کند.

- **Capability:** موجودیت عمومی با ابعاد توانایی، مخاطب، تأیید و انتشار؛ واژگان خدمات کلینیک در Clinic Module می‌آید.
- **Offer:** موجودیت عمومی با شکل، نسخه، بازهٔ اعتبار، Scope و شرایط؛ کاتالوگ و محتوای آفر کلینیکی در Clinic Module می‌آید.
- **Evidence:** منشأ، تازگی و وضعیت تأیید عمومی را نگه می‌دارد؛ منبع و روش راستی‌آزمایی کلینیکی را Clinic Module فراهم می‌کند.
- **Publication:** Gate عمومی انتشار و پس‌گرفتن است؛ Core شرایط Gate را کنترل می‌کند و Module محتوای قابل‌انتشار را تأمین می‌کند.

Core نباید تشخیص دهد یک خدمت کلینیکی چیست، برای چه بیماری مناسب است یا Offer چه معنای پزشکی دارد. این تفکیک با ADR-0011 و تصمیم‌های مصوب D-52، D-53، D-63 و D-68 سازگار است و اضافه‌شدن Moduleهای بعدی را بدون تکثیر Entityهای عمومی ممکن می‌کند.

### ۳.۴ Action و Experience Boundary

Core مسئول مرز اجرای Action است:

- بررسی Session، Permission، Consent و وضعیت جاری؛
- اطمینان از اینکه Action از یک Recommendation یا Decision معتبر آمده است؛
- الزام تأیید انسانی در جایی که Action اختیار یا وضعیت بیرونی را تغییر می‌دهد؛
- جلوگیری از اجرای نتیجهٔ stale یا منقضی.

V2 فقط Action Handoff مجاز تجربه را اجرا می‌کند. UI، Assistant یا Matching حق ایجاد Action کسب‌وکاری یا Grant را ندارند.

## ۴. اجزای Clinic Module

Clinic Module مالک معنا و دادهٔ تخصصی کلینیک است. این Module باید نخستین Vertical را پوشش دهد، بدون آنکه Core را کلینیک‌محور کند.

### ۴.۱ داده و منطق اختصاصی Clinic Module

حداقل دادهٔ لازم برای Demo:

- Organization/Business ID متعارف V1؛
- نام و اطلاعات عمومی کسب‌وکار؛
- واژگان کلینیکی و دسته‌بندی خدمات درمانی؛
- محتوای کاتالوگ کلینیک که روی Capability عمومی Core می‌نشیند؛
- محتوای Offer کلینیکی که روی Offer عمومی Core می‌نشیند؛
- مفاهیم Doctor/Specialist و ویژگی‌های تخصصی پروفایل؛
- منبع و روش راستی‌آزمایی Evidence کلینیکی؛
- workflow نوبت‌دهی و آداپتور سامانهٔ نوبت؛
- منطق ظرفیت و Fixture محدود دمو.

Capability، Offer، Evidence و Publication به‌عنوان Entity و Gate عمومی در Core باقی می‌مانند؛ Clinic Module فقط vocabulary، content، روش راستی‌آزمایی و منطق صنفی خود را فراهم می‌کند. `Organization/Business ID` نیز هویت متعارف V1 است، نه هویت مستقل Module.

دادهٔ شخصی بیمار، پروندهٔ درمان، اطلاعات سلامت، سابقهٔ مشتری و پیام‌های خصوصی در این MVP وارد نمی‌شوند.

### ۴.۲ Clinic workflows

کمینهٔ workflow کلینیک:

۱. نمایندهٔ مجاز با Membership موجود، اطلاعات پایهٔ کلینیک را ثبت/تکمیل می‌کند.

۲. خدمت قابل‌ارائه را با واژگان کلینیکی Module روی Capability عمومی Core اعلام می‌کند.

۳. Capability عمومی Core با داده و روش راستی‌آزمایی Clinic Module از نظر منبع، تأیید، Scope و وضعیت انتشار بررسی می‌شود.

۴. Offer عمومی Core با محتوای کلینیکی و Scope روشن به همان Capability متصل می‌شود.

۵. Gate عمومی Publication پس از تأیید لازم Capability و Offer را به لایهٔ Published می‌برد.

۶. دادهٔ منتشرشده از طریق Read Port به V2 ارائه می‌شود.

ثبت شدن در Published به معنی تضمین ظرفیت زنده، رزروپذیری یا نتیجهٔ درمان نیست؛ هر ادعا باید Evidence و تازگی مشخص داشته باشد.

### ۴.۳ ظرفیت و منطق عملیاتی

منطق ظرفیت در Clinic Module می‌تواند از Value Engineهای موجود V1 استفاده کند. این منطق:

- Observation/Situation عملیاتی را از حقیقت کسب‌وکار جدا نگه می‌دارد؛
- Signal یا Opportunity داخلی تولید می‌کند؛
- Recommendation داخلی را به Capability معتبر اما لزوماً منتشرنشده متصل می‌کند؛
- Action پیشنهادی را برای نقش مجاز آماده می‌کند؛
- بدون تأیید انسانی Action بیرونی اجرا نمی‌کند.

برای این MVP، ظرفیت فقط در حد یک سناریوی قابل‌توضیح و محدود استفاده می‌شود. ظرفیت داخلی نباید به‌صورت خودکار به «الان وقت خالی دارد»، «رزرو قطعی است» یا «این پزشک برای شما مناسب است» تبدیل شود.

## ۵. جریان MVP در V1

### گام ۱: Onboarding کسب‌وکار

یک مسیر محدود داخلی برای یک Clinic Fixture/Business ایجاد می‌شود. Organization ID در V1 مرجع اصلی است و نام کسب‌وکار فقط دادهٔ نمایشی است، نه کلید اتصال.

معیار پذیرش:

- Organization/Business ID پایدار و قابل ردیابی؛
- Membership و Permission از قبل موجود و قابل بررسی؛
- عدم ایجاد هویت مستقل در V2 یا Clinic UI؛
- مشخص بودن آزمایشی‌بودن محیط Demo.

### گام ۲: ایجاد Capability

Clinic Module یک خدمت کلینیکی محدود را به Capability تبدیل می‌کند، با Evidence، Scope، منبع و وضعیت تأیید.

معیار پذیرش:

- Capability به Organization درست متصل باشد؛
- `AI_INFERRED` بدون تأیید انسانی Fact یا Capability قابل انتشار نشود؛
- Capability منتشرنشده در V2 دیده نشود؛
- Core معنای خدمت کلینیکی را تفسیر نکند.

### گام ۳: ایجاد Offer

یک Offer به Capability مشخص و Scope روشن متصل می‌شود. Offer سطح کسب‌وکار به‌تنهایی تخفیف یک خدمت مشخص را ثابت نمی‌کند.

معیار پذیرش:

- Offer آینده، منقضی یا تاریخ‌نامعتبر فعال محسوب نشود؛
- `valid_from` و `valid_until` در مرزها تست شوند؛
- Offer بدون Capability واجد شرایط، عامل Match نشود؛
- دادهٔ ناموجود به‌عنوان قیمت، تخفیف یا دسترسی ساخته نشود.

### گام ۴: Publish

V1 فقط Capability و Offer تأییدشده و قابل انتشار را در Published Projection قرار می‌دهد. انتشار یک مرز خروجی است؛ Capability داخلی می‌تواند برای Recommendation داخلی استفاده شود و همچنان از V2 پنهان بماند.

معیار پذیرش:

- خروجی Published دارای Business ID، Capability ID، Offer ID، Evidence و Freshness باشد؛
- V2 هیچ دسترسی مستقیم به Database یا Event Log نداشته باشد؛
- دادهٔ Published آزمایشی با برچسب صریح به V2 برسد؛
- لغو یا انقضای انتشار/Offer در مصرف بعدی قابل تشخیص باشد.

### گام ۵: Business Action Loop

حلقهٔ داخلی کسب‌وکار برای یک Signal یا Opportunity ظرفیت محدود:

```text
Observation/Signal → Recommendation → Human Decision → ActionRecord
```

در این دامنه:

- Recommendation دلیل، Evidence، Target Role، Priority و Expected Impact دارد؛
- Decision توسط Membership مجاز ثبت می‌شود؛
- ActionRecord جدا از Recommendation ثبت می‌شود؛
- ActionRecord نشان می‌دهد چه اقدامی برای اجرا انتخاب شده است؛
- اجرای بیرونی، Outcome و Evaluation فقط در صورت وجود قرارداد و منبع مستقل، در مراحل بعدی قرار می‌گیرند؛
- کلیک کاربر یا بازشدن Business Details Outcome محسوب نمی‌شود.

نمونهٔ دمو: «سیگنال ظرفیت نشان می‌دهد تقاضا برای خدمت منتخب افزایش یافته است؛ مدیر عملیات مجاز تصمیم می‌گیرد ظرفیت شیفت عصر بررسی شود؛ ActionRecord ایجاد می‌شود.» این مثال نباید به معنی اجرای خودکار تغییر شیفت یا اثبات افزایش درآمد عرضه شود.

## ۶. جریان MVP در V2

### واژگان مرزی V2

در این بخش، Session یعنی **حالت session-only دستیار مشتری** و Session احرازشدهٔ Core نیست. Permission یعنی **دروازهٔ محیط/میزبان برای اجرای Foundation** و Grant سازمانی نیست. Consent یعنی **پذیرش کاربر برای آغاز گفت‌وگو** و جایگزین سیاست R8-a نیست. دستیار مشتری اختیار هیچ شخصی را حمل نمی‌کند.

### گام ۱: Intent input

کاربر در Session فعال، Consent لازم و Permission موجود، نیاز خود را وارد می‌کند. Intent در Core و به‌صورت session-only نگهداری می‌شود.

### گام ۲: Context

کاربر Context محدود و قابل‌مشاهده را مشخص یا تأیید می‌کند؛ مانند خدمت، شعاع، زمان یا شرط صریح.

هر تغییر معنادار در Context یا Intent:

- Revision جدید می‌سازد؛
- Matching قبلی را invalidate می‌کند؛
- تأیید و ارزیابی مجدد می‌خواهد؛
- اجازهٔ ادامهٔ نتیجهٔ stale را نمی‌دهد.

### گام ۳: Discovery

V2 از Published Read Port، Candidateهای مربوط به همان Vertical و همان دامنهٔ آزمایشی را می‌خواند. V2 می‌تواند در تجربهٔ Discovery بر اساس Context کاربر فیلتر کند، اما Business Truth تازه نمی‌سازد.

### گام ۴: Recommendation/Matching

V2 با Eligibility پیش از Ordering:

- Capability واحد را بررسی می‌کند؛
- شرط‌های اجباری را با Evidence همان Capability می‌سنجد؛
- Offer را فقط با Scope و زمان معتبر مصرف می‌کند؛
- نتیجه را با Reason و Evidence Reference توضیح می‌دهد؛
- صفر تا سه نتیجهٔ قطعی و قابل‌ردیابی برمی‌گرداند؛
- از Popularity، پرداخت، تبلیغ یا Preference پنهان استفاده نمی‌کند.

Recommendation در اینجا به معنای خروجی تجربهٔ V2 است و جای Recommendation داخلی V1 را نمی‌گیرد.

### گام ۵: Action Handoff

کاربر یک نتیجهٔ واجد شرایط را آگاهانه انتخاب می‌کند و `Open Business Details` اجرا می‌شود.

این Handoff:

- دوباره Session، Permission، تازگی و Eligibility را بررسی می‌کند؛
- در صورت stale/expired بودن متوقف می‌شود؛
- اطلاعات Published همان کسب‌وکار و Option را نشان می‌دهد؛
- Action کسب‌وکاری، رزرو، خرید، Lead یا گفت‌وگوی واقعی ایجاد نمی‌کند؛
- در Storage پایدار، Event Log کسب‌وکار یا Outcome ثبت نمی‌شود.

## ۷. داده و اجزای قابل Mock

### قابل Mock با برچسب صریح

- یک Organization و Clinic Fixture؛
- یک Capability کلینیکی با Evidence کنترل‌شده؛
- یک Offer با تاریخ‌های آزمون‌پذیر؛
- Published Business Reader درون‌فرآیندی؛
- Clock، Session و Membership Fixture برای تست؛
- پاسخ ثابت و محلی برای Intent در دامنهٔ محدود MVP؛
- دادهٔ نمایشی لازم برای Demo، مشروط به اینکه هر ادعا به Fixture و Evidence وصل باشد.

### نباید Mock وانمودشده باشد

- Permission یا Grant جدید؛
- Availability زنده یا رزروپذیری؛
- سلامت، سابقه یا ترجیح شخصی مشتری؛
- Review، محبوبیت، درآمد، Visit یا Conversion؛
- Outcome یا Evaluation ساختگی؛
- اجرای واقعی Action در سیستم بیرونی؛
- اتصال مستقیم V2 به Database یا Event Log V1.

## ۸. حداقل Investor Demo

دموی سرمایه‌گذار باید در یک مسیر کوتاه نشان دهد:

۱. یک نمایندهٔ مجاز، یک Clinic را در V1 ثبت می‌کند.

۲. یک خدمت کلینیکی با Evidence مشخص Capability می‌شود.

۳. یک Offer معتبر به همان Capability متصل و Published می‌شود.

۴. یک Signal/Recommendation داخلی ظرفیت برای نقش مجاز ایجاد می‌شود و با Decision انسانی به ActionRecord می‌رسد.

۵. یک مشتری نیاز مشخص خود را در V2 وارد و Interpretation/Context را تأیید می‌کند.

۶. V2 فقط دادهٔ Published را می‌خواند، Capability و Offer واجد شرایط را پیدا می‌کند و دلیل را نشان می‌دهد.

۷. مشتری با یک اقدام آگاهانه جزئیات همان Clinic/Option را باز می‌کند.

۸. ارائه‌دهنده توضیح می‌دهد که این Demo چه چیزی را ثابت می‌کند: اتصال کنترل‌شدهٔ Business Capability به Customer Intent؛ و چه چیزی را هنوز ثابت نمی‌کند: رزرو، درآمد، مراجعه، کیفیت درمان یا Outcome واقعی.

دمو باید بدون AR، Map، Marketplace، دادهٔ شخصی یا اتصال Production قابل اجرا باشد و قطع Tile یا Provider آن را متوقف نکند.

## ۹. چیزهایی که صریحاً خارج از Scope هستند

- AR expansion و Virtual Storefront؛
- Marketplace و رتبه‌بندی پولی؛
- پیاده‌سازی Vertical دوم در این MVP؛ خود MLINO همچنان یک Platform چندVertical باقی می‌ماند؛
- Restaurant، Retail، Beauty یا Vertical دوم در این MVP؛
- Advanced Learning و Cross-business Learning؛
- Customer Voice و دادهٔ شخصی/سلامت؛
- Production V1 Connector یا اتصال مستقیم به Database؛
- Billing، رزرو واقعی، پرداخت، Lead و گفت‌وگوی واقعی؛
- Persistent memory، transcript و پروفایل‌سازی مشتری؛
- اجرای خودکار Action یا تغییر اختیار سازمانی؛
- اضافه‌کردن واژگان یا جدول‌های Clinic به Core.

## ۱۰. ترتیب نخستین پیاده‌سازی

۱. **بستن Gate مبنا:** بررسی ارجاع ADRها، تعیین Fixture و سناریوی Clinic، ثبت آزمایشی‌بودن Demo.

۲. **تکمیل حداقل Foundation عمومی Core:** Identity، Membership/Permission consumption و Entity/Gate عمومی Capability، Offer، Evidence و Publication؛ بدون منطق کلینیکی و بدون فعال‌کردن تجربهٔ مشتری V2.

۳. **تکمیل Clinic Module:** واژگان خدمات و درمان، محتوای Capability/Offer روی Entityهای عمومی Core، Doctor/Specialist، workflow نوبت‌دهی و ظرفیت محدود.

۴. **ساخت حلقهٔ ارزش کسب‌وکار V1:** Onboarding، هویت Organization، انتشار دادهٔ معتبر و سپس Signal/Recommendation → Decision → ActionRecord. تا پایان این مرحله مسیر V1 باید به‌تنهایی یک ارزش قابل‌نمایش داشته باشد.

۵. **ساخت Published Business Reader/Mock Adapter:** Port فقط‌خواندنی برای خروجی منتشرشدهٔ V1 و نگاشت صریح Business/Capability/Offer/Evidence؛ دسته از دادهٔ V1 و vocabulary ثبت‌شدهٔ Module می‌آید.

۶. **ساخت تجربهٔ مشتری V2 پس از حلقهٔ V1:** Context و Orchestration، Intent، Discovery، Matching با Eligibility پیش از Ordering و Experience/Action Handoff؛ مسیر جدید از Legacy Matching جدا می‌ماند.

۷. **ساخت Demo و تست:** مسیر کامل V1 سپس V2، شامل بدون نتیجه، Offer نامعتبر، Revision stale، Permission ناکافی و Session منقضی.

Database، API تولیدی و V1↔V2 live integration بعد از این مراحل و فقط با قرارداد/تصمیم اجرایی جدا بررسی می‌شوند.

## ۱۱. معیارهای پذیرش Scope

Scope فقط زمانی برای تحویل MVP مناسب است که:

- یک Clinic Fixture از Onboarding تا Published Capability/Offer عمومی قابل ردیابی باشد؛
- V1 مالک Business Truth و ActionRecord بماند؛
- V2 فقط Published Read Port را مصرف کند؛
- Intent و Context session-only و قابل invalidate باشند؛
- Matching فقط یک Capability/Offer مصداقیِ واجد همهٔ شرط‌ها را معتبر بداند؛ واژهٔ `Option` در این سند Entity مستقل نیست و فقط به مصداق یا Scope ثبت‌شدهٔ Capability/Offer اشاره می‌کند؛
- Offer آینده، منقضی، نامعتبر یا بدون Scope معتبر وارد نتیجه نشود؛
- هر Recommendation دلیل و Evidence داشته باشد؛
- Action Handoff با Permission موجود انجام شود و اختیار جدید نسازد؛
- هیچ کلیک یا نمایش به‌عنوان Outcome یا موفقیت تجاری گزارش نشود؛
- تغییر vocabulary و Module یک Vertical بعدی نیازمند تغییر Core نباشد؛
- تست‌ها و Demo بدون دادهٔ شخصی و بدون اتصال Production اجرا شوند.

## ۱۲. رأی نهایی

**A) Ready for implementation**

این Scope کوچک، قابل‌تفکیک و با ADR-0001 تا ADR-0012 هم‌راستاست. موارد مفقود فعلی، مانند Entityهای عمومی Core، محتوای Clinic Module، حلقهٔ ارزش V1 و سپس تجربهٔ V2، کارهای همین MVP هستند و تعارض معماری ایجاد نمی‌کنند.

شروع اجرا باید از Gate مبنا، سپس Core و Clinic Module و حلقهٔ ارزش V1 باشد؛ تجربهٔ مشتری V2 بعد از وجود این حلقه تکمیل می‌شود. هیچ تیمی نباید برای کوتاه‌کردن مسیر، Clinic vocabulary را وارد Core، V2 را به Database متصل یا Action Handoff را به Outcome واقعی تعبیر کند.

من کدکس هستم
