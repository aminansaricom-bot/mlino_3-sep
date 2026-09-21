# MLINO Catalog and Media Design

**Status:** DRAFT  
**Instruction:** `CODEX-20260921-K1-CATALOG-MEDIA-DESIGN-001`  
**Scope:** طراحی دامنه، قرارداد عمومی، ذخیره‌سازی، تحویل و مصرف Catalog همراه Media؛ بدون تغییر کد، Prisma، migration یا V2.

## 1. هدف و مبنای موجود

این سند راهی عمومی برای نمایش اقلام قابل مرور یا فروش هر کسب‌وکار طراحی می‌کند؛ اقلام می‌توانند منوی کافه، کالای فروشگاه یا فهرست خدمات کلینیک باشند. هدف، افزودن یک مفهوم business-agnostic است و هیچ واژگان یا workflow اختصاصی کلینیک را وارد Core نمی‌کند.

Core فعلی `Capability` را با چرخهٔ وضعیت، تأیید، انتشار و revision نگه می‌دارد؛ `Offer` و `OfferVersion` نیز کلید پایدار Offer، نسخه، قیمت یا حالت on-request و بازهٔ اعتبار دارند (`origin/main:implementation/prisma/schema.prisma:496-527,530-576`). `Publication` فعلی فقط سه FK اختیاری برای BusinessProfile، Capability و OfferVersion دارد و snapshot منتشرشده را در `published_content` نگه می‌دارد (`origin/main:implementation/prisma/schema.prisma:626-654`). سرویس انتشار نیز فقط همین سه target را می‌پذیرد (`origin/main:implementation/core/publication-service.ts:85-95`). در نتیجه CatalogItem جدید، اگر تصویب شود، به CCR، schema، service و publication target تازه نیاز دارد؛ این سند هیچ‌کدام را اعمال نمی‌کند.

مسیر Public Export کنونی snapshotهای منتشرشده را در یک transaction با `RepeatableRead` می‌خواند، eligibility زنده را fail-closed اعمال می‌کند و خروجی امضاشده می‌سازد (`origin/main:implementation/public-export/builder.ts:147-180,191-223`). Consumer فعلی V2 نیز کلیدهای ناشناخته را رد می‌کند و record را فقط با کلیدهای `business`, `capabilities`, `offers`, `stale`, `ordering` می‌پذیرد (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/publicExport/mapping.ts:27-32,126-146`). این دو واقعیت، مرز سازگاری K4 را تعیین می‌کنند.

## 2. K1 — مدل دامنهٔ Catalog

### 2.1 گزینه A: گسترش OfferVersion با Media و فیلدهای Catalog

در این گزینه هر قلم Catalog یک Offer/OfferVersion است یا media مستقیماً به OfferVersion افزوده می‌شود. این گزینه از نسخه‌بندی، قیمت، on-request و بازهٔ اعتبار موجود استفاده می‌کند (`origin/main:implementation/prisma/schema.prisma:530-576`) و جریان انتشار OfferVersion در حال حاضر snapshot را پس از قفل Offer و Version می‌سازد (`origin/main:implementation/core/publication-service.ts:60-82,121-138`).

**Core/module test:** مدل از نظر نام می‌تواند عمومی بماند، اما معنای Offer با قلم پایدار Catalog یکی نیست. یک فنجان قهوه یا خدمت معاینه ممکن است قلم دائمی Catalog باشد، در حالی که Offer برای نسخه و replacement یک پیشنهاد مناسب است. پیوندزدن این دو، lifecycle تغییر قیمت/تصویر Catalog را با replacement OfferVersion یکی می‌کند.

**هزینه:** schema کمتر گسترش می‌یابد، اما OfferService، snapshot، exporter و UI پیچیده می‌شوند و مرز «Catalog item» و «promotion/offer» مبهم می‌شود. OfferVersion فعلی immutable است و شمارهٔ نسخه زیر قفل Offer محاسبه می‌شود (`origin/main:implementation/core/offer-service.ts:48-77`)؛ ویرایش روزمرهٔ کاتالوگ در این مدل همیشه نسخهٔ Offer تازه می‌خواهد.

**نگاشت عمودی:** منوی کافه، کالای فروشگاه و خدمت کلینیک همگی به OfferVersion تبدیل می‌شوند، حتی وقتی هیچ پیشنهاد یا campaign وجود ندارد. این اجبار، معنای دامنه را ضعیف می‌کند.

### 2.2 گزینه B: موجودیت عمومی تازهٔ CatalogItem در Core

مدل پیشنهادی شامل `organization_id`, `item_key`, `name`, `short_description`, حالت قیمت (`price_amount` + `price_currency` یا `on_request`)، `grouping_label` اختیاری، `display_order`, `available_from`, `available_until`, lifecycle، publication status، content revision و timestamps است. media با رابطهٔ مرتب جدا یا metadata مرتب وابسته به item نگه‌داری می‌شود. همهٔ FKها باید organization را در composite relation حمل کنند تا cross-organization reference غیرممکن بماند؛ الگوی فعلی OfferVersion و Capability همین organization-scoped relation و uniqueness را نشان می‌دهد (`origin/main:implementation/prisma/schema.prisma:516-526,565-575`).

**Core/module test:** هر کسب‌وکار می‌تواند «چیزی که قابل مرور است» داشته باشد؛ مدل هیچ فیلد دندانپزشکی، غذا، SKU انبار، نوبت یا ظرفیت ندارد. واژگان تخصصی، inventory، recipe، appointment و workflow عمودی در module باقی می‌مانند.

**هزینه:** CCR و migration برای CatalogItem، CatalogItemMedia و target تازهٔ Publication؛ serviceهای create/update/activate/retire؛ permissionهای مشخص؛ snapshot builder؛ exporter و consumer تازه لازم‌اند. مدل Publication فعلی برای target چهارم ستون ندارد (`origin/main:implementation/prisma/schema.prisma:626-654`) و `PublicationService.validateTarget` نیز target تازه را رد می‌کند (`origin/main:implementation/core/publication-service.ts:85-87`).

**نگاشت عمودی:** کافه itemهای «اسپرسو» و «کیک» را زیر groupingهای «نوشیدنی» و «دسر» می‌گذارد؛ فروشگاه itemهای قابل مرور را با item_key پایدار عرضه می‌کند، بدون اینکه inventory را وارد Core کند؛ کلینیک itemهای «معاینه» و «جرم‌گیری» را نمایش می‌دهد، بدون appointment، specialist یا capacity. در هر سه حالت Offer جداگانه می‌تواند یک promotion را به item مرتبط کند؛ شکل و cardinality این پیوند تصمیم باز K-D4 است.

### 2.3 گزینه C: نگه‌داری کامل Catalog بیرون از Core

هر module مدل خودش را دارد و یک adapter خروجی مشترک می‌سازد. این گزینه storage عمودی را مستقل نگه می‌دارد، اما سه module نخست احتمالاً سه مدل و سه مسیر publication خواهند ساخت. V2 نباید module table را مستقیم بخواند؛ بنابراین حتی در این گزینه یک قرارداد و representation عمومی منتشرشده لازم است.

**هزینه:** Core schema کوچک‌تر می‌ماند، ولی publication، tenant isolation، permission و fidelity باید در هر module دوباره پیاده یا در یک لایهٔ مشترک جدید حل شوند. احتمال ایجاد identity/publication system دوم بالا می‌رود.

### 2.4 توصیه و lifecycle پیشنهادی

**توصیه: گزینه B، مشروط به تصویب CCR.** CatalogItem یک مفهوم عمومی و مستقل از promotion است، و Offer می‌تواند همان Offer باقی بماند. این توصیه هنوز تصمیم معماری نیست.

چرخهٔ پیشنهادی، الگوی موجود Capability و Publication را تکرار می‌کند:

1. `create` یک item در حالت DRAFT/PLANNED می‌سازد و فقط فیلدهای allowlist‌شده را می‌پذیرد. Capability فعلی create و allowlist را پیش از transaction اعمال می‌کند (`origin/main:implementation/core/capability-service.ts:27-49`).
2. `activate` item را برای انتشار eligible می‌کند؛ Capability فعلی فقط PLANNED را به ACTIVE می‌برد (`origin/main:implementation/core/capability-service.ts:92-107`).
3. تغییر فیلد عمومی، revision را بالا می‌برد و snapshot قبلی را تغییر نمی‌دهد. Publication فعلی snapshot allowlist‌شده را داخل همان transaction و پس از `FOR UPDATE` می‌سازد (`origin/main:implementation/core/publication-service.ts:30-54,89-138`).
4. `publish` یک Publication append-only با snapshot metadata و فهرست media referenceها ثبت می‌کند؛ انتشار revision یکسان idempotent است، مانند نتیجهٔ `ALREADY_PUBLISHED` فعلی (`origin/main:implementation/core/publication-service.ts:45-54`).
5. `withdraw` event تازه ثبت می‌کند و bytes یا history را حذف نمی‌کند؛ جریان فعلی withdraw نیز Publication تازه می‌سازد (`origin/main:implementation/core/publication-service.ts:25-27,48-54`).
6. `retire` فقط پس از withdraw مجاز باشد و بازگشت به ACTIVE نیازمند تصمیم مستقل باشد. این policy در CCR K2 نهایی می‌شود.

## 3. K2 — مدل Media

هر CatalogItem می‌تواند صفر تا N تصویر مرتب داشته باشد. metadata پیشنهادی هر تصویر در snapshot امضاشده:

```ts
type CatalogImageRefV1 = {
  position: number;
  path: string;                  // relative, content-addressed, under media/
  sha256: string;                // lowercase 64 hex chars; hash exact response bytes
  media_type: 'image/avif' | 'image/webp' | 'image/jpeg' | 'image/png';
  byte_size: number;
  width_px: number;
  height_px: number;
  alt_text: string;
  placeholder?: { kind: 'blurhash-v1'; value: string };
};
```

**قاعدهٔ اصلی:** bytes تصویر بیرون از artifact امضاشده می‌ماند. داخل artifact فقط reference نسبی، hash دقیق bytes، media type، size، dimensions، alt text و placeholder اختیاری قرار می‌گیرد. Artifact فعلی canonical و امضاشده است؛ امضا metadata را پوشش می‌دهد (`origin/main:implementation/public-export/canonical.ts:48-53`; `origin/main:implementation/public-export/signing.ts:19-33`). خود bytes با تطبیق SHA-256 به آن metadata متصل می‌شود.

مقادیر پیشنهادی برای تصمیم مالک:

- حداکثر ۸ تصویر برای هر item.
- حداکثر 1,500,000 bytes برای هر تصویر و حداکثر 8,000,000 bytes مجموع media هر item.
- عرض و ارتفاع هرکدام بین 320 و 4096 px و حداکثر 16 megapixels.
- allowlist فقط AVIF، WebP، JPEG و PNG؛ SVG و animated formats در v1 پذیرفته نشوند.
- نسبت پیشنهادی AR برابر 4:3 افقی، با safe area مرکزی 1:1؛ نسبت خارج از بازهٔ 1:1 تا 16:9 رد نشود ولی warning تولید کند.
- placeholder اختیاری، نسخه‌دار و حداکثر 256 نویسه؛ placeholder دادهٔ نمایشی کم‌جزئیات است و جای verify تصویر را نمی‌گیرد.
- `alt_text` الزامی، non-empty و حداکثر 300 نویسه.

Producer باید hash، size، type و dimensions را از derivative نهایی محاسبه کند، نه از original. Extension از media type مشتق می‌شود و ورودی کاربر نام فایل عمومی را تعیین نمی‌کند.

## 4. K3 — ذخیره‌سازی و تحویل

### 4.1 مسیر فایل‌ها

Originalها در یک دایرکتوری خصوصی producer، بیرون repository و بیرون public directory نگه‌داری می‌شوند. مرحلهٔ processing یک derivative بدون metadata اضافی می‌سازد، policy K2 را بررسی می‌کند و سپس نام عمومی را از hash bytes می‌سازد:

```text
media/sha256/<first-two-hex>/<64-hex-sha256>.<canonical-extension>
```

یک نام محتواآدرس‌پذیر هرگز به bytes دیگری اشاره نمی‌کند. جایگزینی تصویر یعنی hash/path تازه و publication تازه؛ overwrite فایل موجود ممنوع است.

### 4.2 امتداد distribution موجود

Distribution فعلی source/public directory را absolute، موجود و جدا از repository می‌خواهد (`origin/main:implementation/public-export/distribution/distribute.ts:42-50`)، artifact را canonical، version-compatible، تازه و دارای امضای معتبر بررسی می‌کند (`origin/main:implementation/public-export/distribution/distribute.ts:60-95`) و با فایل موقت و rename محدودشده جایگزین می‌کند (`origin/main:implementation/public-export/distribution/distribute.ts:96-125`). امتداد پیشنهادی:

1. catalog artifact امضاشده و تمام media referenceهای آن را verify کند.
2. هر media را از staging بخواند، size/type/dimensions/hash را دوباره بررسی کند.
3. mediaهای content-addressedِ غایب را با temp-file + flush + atomic rename بنویسد؛ فایل موجود فقط وقتی پذیرفته شود که hash bytes برابر نام باشد.
4. **پس از** قرارگرفتن همهٔ mediaها، artifact catalog را با atomic rename منتشر کند. بنابراین consumer هیچ artifact تازه‌ای نمی‌بیند که mediaهایش هنوز توزیع نشده‌اند.
5. log فقط hash/path عمومی و نتیجه را ثبت کند؛ original path یا دادهٔ حساس log نشود.

Artifact فعلی سقف 2,000,000 bytes دارد (`origin/main:implementation/public-export/distribution/distribute.ts:7-9,80-100`). جدا بودن media مانع ورود bytes تصویر به این سقف می‌شود، ولی metadata catalog همچنان باید زیر سقف artifact خودش بماند.

### 4.3 route وب

Nginx فعلی artifact را با exact-match، `no-store`, `nosniff` و 404 واقعی سرو می‌کند و SPA fallback فقط در `location /` است (`origin/codex/v2-intent-flow-foundation:mlino2/app/nginx.conf:23-36,61-64`). برای media چون نام‌ها پویا هستند، پیشنهاد یک prefix محدود است:

```nginx
location ~ ^/public-export/media/sha256/([0-9a-f]{2})/([0-9a-f]{64})\.(avif|webp|jpg|png)$ {
  alias /srv/mlino-public-export/media/sha256/$1/$2.$3;
  if (!-f $request_filename) { return 404; }
  autoindex off;
  limit_except GET { deny all; }
  types { image/avif avif; image/webp webp; image/jpeg jpg; image/png png; }
  default_type application/octet-stream;
  add_header Cache-Control "public, max-age=31536000, immutable" always;
  add_header X-Content-Type-Options "nosniff" always;
  # سایر headerهای امنیتی server نیز به‌علت inheritance اینجا تکرار شوند.
}
```

Route نهایی باید traversal، symlink خروجی، dotfile، extension ناشناخته و هر fallback به `index.html` را رد کند. Content-Type باید از extension canonical allowlist تعیین شود؛ header ورودی یا نام original منبع اعتماد نیست.

### 4.4 garbage collection

GC فقط mediaهایی را candidate می‌کند که در artifact جاری و دو artifact retained قبلی reference نشده‌اند. حذف پس از grace period پیشنهادی ۷ روز و یک scan دوباره انجام می‌شود. خرابی یا نبود artifact، GC را fail-closed متوقف می‌کند. حذف originalها policy جداگانهٔ retention است و در K1 اجرا نمی‌شود.

## 5. K4 — تغییر قرارداد و سازگاری

Consumer موجود envelope و record را strict می‌خواند؛ هر top-level field ناشناخته در record با `PUBLIC_EXPORT_UNKNOWN_PUBLIC_FIELD` رد می‌شود (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/publicExport/mapping.ts:27-32,126-146`). افزودن مستقیم `catalog_items` به `public-business.v1` بنابراین buildهای نصب‌شدهٔ فعلی را می‌شکند.

### گزینه A: field افزایشی همراه contract version bump

`public-business.v2` شامل catalog می‌شود و producer مدتی v1 و v2 را هم‌زمان منتشر می‌کند. strictness حفظ می‌شود، اما producer، distributor، Nginx و consumer باید dual-version شوند و رابطهٔ snapshot/media در artifact بزرگ‌تر مدیریت شود.

### گزینه B: artifact دوم در کنار artifact فعلی

`public-catalog.v1.json` یک envelope امضاشدهٔ مستقل با `generated_at`, `snapshot_id`, `signature` و recordهای organization-scoped دارد. build قدیمی V2 آن را درخواست نمی‌کند و `public-business.v1.json` بدون تغییر می‌ماند. build جدید catalog را اختیاری می‌خواند؛ 404 یعنی «Catalog منتشر نشده»، نه خرابی business snapshot. هزینهٔ این گزینه هماهنگی دو snapshot و تعریف binding اختیاری مانند `business_snapshot_id` است.

### گزینه C: نادیده‌گرفتن unknown fields

Parser فعلی relaxed می‌شود. rollout آسان‌تر است، اما schema drift و typoها دیگر fail-closed نیستند. امضا فقط bytes را معتبر می‌کند و معنای field ناشناخته را تضمین نمی‌کند؛ بنابراین strictness قرارداد تضعیف می‌شود.

### توصیه و ترتیب rollout

**توصیه: گزینه B.** این گزینه هیچ field تازه‌ای به `public-business.v1` اضافه نمی‌کند و build قدیمی را نمی‌شکند. ترتیب دقیق پیشنهادی:

1. CCR مدل Catalog/Media و قرارداد `mlino.v2.public-catalog.v1` تصویب شود.
2. routeهای catalog و media deploy شوند، در حالی که نبود فایل 404 واقعی می‌دهد.
3. consumer جدید با parser strict و رفتار «404 = catalog خالی» منتشر شود؛ feature در UI هنوز خاموش بماند.
4. producer و distributor ابتدا mediaها و سپس catalog artifact را منتشر کنند.
5. smoke check نشان دهد artifact و تمام hashها قابل verify هستند.
6. feature Catalog/AR در build جدید فعال شود. build قدیمی همچنان فقط business artifact قبلی را می‌خواند.
7. `catalog_items` هرگز به `public-business.v1` افزوده نشود؛ هر تغییر بعدی version مستقل می‌خواهد.

## 6. K5 — Consumer و UI

### 6.1 verify هر تصویر

Consumer فقط image reference داخل catalog artifact پذیرفته‌شده را مصرف می‌کند. برای هر تصویر:

1. path باید relative و مطابق الگوی content-addressed باشد؛ URL کامل، `..`, backslash، query و fragment رد شود.
2. response به‌صورت streaming با cap همان `byte_size` و سقف policy خوانده شود. Transport فعلی نیز `Content-Length` و اندازهٔ جریان را پیش از پذیرش cap می‌کند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/publicExport/transport.ts:7-31`).
3. bytes واقعی SHA-256 شوند و با hash signed برابر باشند.
4. magic bytes و media type allowlist با metadata signed و response header سازگار باشند.
5. dimensions decoded با metadata و caps برابر باشند.
6. فقط پس از همهٔ checks، object URL یا cache entry ساخته شود.

در mismatch، فایل گم‌شده، decode failure یا timeout، تصویر نمایش داده نمی‌شود. UI می‌تواند placeholder امضاشدهٔ همان reference یا یک قاب خنثی محلی نشان دهد، ولی هرگز URL جایگزینِ تأییدنشده، social-media fallback یا تصویر از live row را مصرف نمی‌کند.

### 6.2 lazy load و offline

تصویر نخست فقط برای card قابل‌مشاهده یا AR primary card prefetch می‌شود؛ بقیه هنگام swipe بارگیری می‌شوند. cache با hash کلید می‌خورد، نه URL mutable. در offline فقط bytesی نمایش داده می‌شود که قبلاً کامل verify شده و هنوز توسط catalog artifact پذیرفته‌شده reference می‌شود؛ cache ناقص یا بدون metadata signed نادیده گرفته می‌شود.

### 6.3 ویترین AR

AR فعلی هر business را با `activeProducts` و نخستین Offer فعال مدل می‌کند (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/ar/ArOverlayService.ts:30-39,85-110`). View فعلی یک primary card و چند bubble فرعی روی صحنه می‌گذارد (`origin/codex/v2-intent-flow-foundation:mlino2/app/src/ar/ArVitrineView.tsx:136-167`). طراحی پیشنهادی:

- business placement، distance، camera و heading فعلی حفظ شود.
- primary card یک stack از CatalogItemهای همان business بسازد؛ swipe چپ/راست item و dot indicator را عوض کند.
- هر item ابتدا متن و قیمت/on-request را نشان دهد؛ media فقط پس از verify ظاهر شود.
- ترتیب `grouping_label`, سپس `display_order`, سپس `item_key` قطعی باشد.
- capability و Offer همچنان بخش‌های جدا بمانند؛ Offer می‌تواند badge یا پیوند اختیاری به item بدهد، ولی CatalogItem از Offer مشتق نشود.
- business بدون coordinates در list/detail باقی بماند و در AR وارد نشود؛ U2 adapter موجود همین جداسازی records دارای coordinates را انجام می‌دهد (`77e7bdbc8bf121c0c45ff88590404a5e522d0477:mlino2/app/src/publicExport/uiAdapter.ts:21-61`). این module در ref نام‌بردهٔ `origin/codex/v2-intent-flow-foundation` وجود ندارد و در این سند فقط به commit محلیِ قابل‌خواندن بالا استناد شده است.

طراحی Real UI نیز تصریح می‌کند که AR فعلی products قدیمی را مصرف می‌کند و seam واقعی باید Capability/Offer را از `PublicUiRecord` بگیرد (`6f2c8a58f1cbbb441ff09a10d9b3e6f094e2aa19:mlino2/MLINO_V2_REAL_UI_AND_ASSISTANT_DESIGN.md:20-24,63-73`). Catalog stack باید پس از adapter/verification اضافه شود، نه در لایهٔ trust یا signature.

## 7. K6 — دادهٔ آزمایشی

Sample Catalog برای businessهای آزمایشی موجود فقط از داده و تصویر تولیدشدهٔ محلی ساخته می‌شود:

- item_key با prefix ثابت مانند `test-ui-vanak-catalog-`، نام و توضیح دارای «آزمایشی»، و grouping عمومی.
- تصویرهای deterministic PNG/WebP از رنگ، شکل هندسی و متن TEST ساخته شوند؛ هیچ عکس اینترنت، شبکهٔ اجتماعی یا دارایی واقعی کسب‌وکار خوانده نشود.
- seed ابتدا bytes را تولید و policy K2 را validate می‌کند، سپس hash/path را ثبت می‌کند؛ rerun همان bytes و hash را می‌سازد.
- integration test ثابت می‌کند catalog artifact فقط itemهای ACTIVE/PUBLISHED را دارد و هر media hash با فایل تولیدشده برابر است.
- cleanup با withdraw publication و سپس retire/archive service انجام شود؛ DELETE/TRUNCATE/DROP یا پاک‌کردن history مجاز نباشد.
- GC آزمایشی فقط فایل‌هایی را حذف کند که دیگر در artifact جاری/retained reference ندارند و marker/path آزمایشی دارند.

## 8. K7 — جدول تهدید و خرابی

| حالت | تشخیص | رفتار fail-closed | آزمون لازم |
|---|---|---|---|
| bytes تصویر جابه‌جا شده | SHA-256 bytes با hash signed برابر نیست | تصویر مخفی؛ artifact business همچنان قابل استفاده | fixture با همان path و bytes متفاوت |
| hash metadata نادرست | نام content-addressed و hash signed ناسازگار | catalog item متنی نمایش داده شود، تصویر نه | تغییر یک nibble hash |
| media بزرگ | Content-Length یا streaming count از cap بیشتر | abort fetch، cache نشود | بدون Content-Length و stream بزرگ |
| media type اشتباه | magic bytes، extension، signed type یا header ناسازگار | رد فایل | JPEG با پسوند PNG و header WebP |
| path خارج media folder | parser path شامل `..`, URL, backslash یا encoded traversal | پیش از fetch رد شود | table-driven traversal corpus |
| cache poisoning نام immutable | فایل موجود hashش با نام برابر نیست | distributor overwrite نکند و hard fail؛ consumer نیز hash را رد کند | فایل قبلی آلوده با همان path |
| رشد artifact | catalog metadata از 2,000,000 bytes بیشتر | producer/distributor fail؛ artifact قبلی باقی بماند | boundary 1,999,999 / 2,000,001 bytes؛ سقف موجود در distribution فعلی 2,000,000 است (`origin/main:implementation/public-export/distribution/distribute.ts:7-9,80-100`) |
| media گم‌شده/404 | fetch 404 | تصویر نمایش داده نشود؛ SPA HTML پذیرفته نشود | route missing-file و content-type test |
| offline | fetch شکست می‌خورد | فقط cache قبلاً verifyشده؛ در غیر این صورت قاب خنثی | offline with verified cache / empty cache |
| artifact معتبر ولی media هنوز توزیع نشده | ترتیب انتشار شکسته | distributor catalog را آخر publish کند؛ smoke check fail | fault injection میان media و artifact rename |
| placeholder مخرب یا بسیار بزرگ | schema، kind و طول allowlist | placeholder حذف/رد؛ remote fallback ممنوع | unknown kind و over-limit value |

## 9. K8 — تصمیم‌های باز مالک

هیچ مورد زیر در این سند تصویب نشده است.

1. **K-D1 — مالکیت مدل:** A) گسترش OfferVersion؛ B) CatalogItem عمومی در Core؛ C) module-only. **توصیه: B**؛ معنای Catalog از promotion جدا و multi-vertical می‌ماند.
2. **K-D2 — lifecycle:** A) DRAFT → ACTIVE → RETIRED همراه publication status جدا؛ B) فقط ACTIVE/RETIRED؛ C) version-only. **توصیه: A**؛ با الگوی Capability/Publication هم‌راستاتر است.
3. **K-D3 — media persistence:** A) جدول CatalogItemMedia؛ B) JSON روی CatalogItem؛ C) فقط snapshot. **توصیه: A**؛ ordering، tenant FK و validation روشن‌تر است، در حالی که snapshot همچنان metadata نهایی را نگه می‌دارد.
4. **K-D4 — ارتباط Offer و CatalogItem:** A) بدون relation در v1؛ B) relation اختیاری organization-scoped؛ C) CatalogItem از Offer مشتق شود. **توصیه: B** با cardinality چندبه‌چند و فقط پیش از publication OfferVersion؛ C رد شود.
5. **K-D5 — قرارداد انتشار:** A) افزودن به public-business با version bump؛ B) artifact دوم `public-catalog.v1.json`؛ C) parser relaxed. **توصیه: B** برای جلوگیری از شکست build قدیمی.
6. **K-D6 — media allowlist:** A) AVIF/WebP/JPEG/PNG؛ B) فقط WebP/JPEG؛ C) SVG نیز مجاز. **توصیه: A**؛ SVG در v1 مجاز نباشد.
7. **K-D7 — limits:** A) مقادیر پیشنهادی K2؛ B) limits کوچک‌تر؛ C) configurable بدون سقف قرارداد. **توصیه: A** و هر تغییر future با contract version.
8. **K-D8 — نسبت و placeholder:** A) 4:3 guidance + center 1:1 + BlurHash اختیاری؛ B) crop اجباری 1:1؛ C) بدون placeholder. **توصیه: A**.
9. **K-D9 — storage original:** A) producer-private originals + public derivatives؛ B) فقط derivatives؛ C) object storage خارجی. **توصیه: A** برای نخستین local deployment؛ C نیازمند طراحی trust/availability جداست.
10. **K-D10 — GC:** A) current + دو retained + ۷ روز grace؛ B) هرگز حذف نشود؛ C) حذف فوری unreferenced. **توصیه: A**.
11. **K-D11 — offline cache:** A) فقط verified bytes keyed by hash تا زمانی که artifact پذیرفته‌شده reference دارد؛ B) بدون media cache؛ C) URL cache معمولی. **توصیه: A**.
12. **K-D12 — permission keys:** A) `catalog_item.manage` + `publication.manage`؛ B) reuse `offer.manage`; C) module permissions. **توصیه: A**؛ role هیچ permission تولید نمی‌کند.
13. **K-D13 — item-media count and alt text:** A) حداکثر ۸ و alt text اجباری؛ B) حداکثر ۴؛ C) alt text اختیاری. **توصیه: A**.
14. **K-D14 — binding دو artifact:** A) catalog شامل `business_snapshot_id` باشد؛ B) فقط organization_id؛ C) merge در producer. **توصیه: A** و mismatch باعث مخفی‌شدن catalog همان business شود.

### تقسیم اجرای پیشنهادی؛ هر مرحله نیازمند تصویب جداگانه

1. **K2 — CCR:** تصمیم‌های K-D1 تا K-D14، Prisma diff پیشنهادی، constraintها، migration/rollback و contract DTO؛ document first.
2. **K3 — Core:** CatalogItem، media metadata، serviceها، permissions، lifecycle و publication snapshot؛ بدون exporter/UI.
3. **K4 — Export و distribution:** artifact دوم، signing، cap، media staging، atomic order، Nginx route و GC runbook.
4. **K5 — Consumer و AR UI:** parser strict، verify/hash/cache، adapter، cards و swipeable AR stack.
5. **K6 — Sample data:** generator محلی، seed/withdraw، fixtureها و integration validation.

هر مرحله پس از گزارش Codex متوقف می‌شود و به review Guardian و مجوز مرحلهٔ بعد نیاز دارد.

## 10. سازگاری و tenant isolation

- همهٔ CatalogItemها و media metadataها organization-scoped هستند؛ هیچ reference بین دو organization پذیرفته نمی‌شود.
- actor و organization از AuthContext می‌آیند؛ organizationId ورودی قابل اعتماد نیست.
- permission از Membership/Grant می‌آید و role فقط label است.
- platform verification actor عضو کسب‌وکار نمی‌شود.
- publication snapshot تنها منبع content عمومی است؛ exporter برای نام، قیمت، description یا media metadata به live row برنمی‌گردد.
- bytes media business data عمومی‌اند، ولی فقط reference تأییدشده در artifact امضاشده به آن‌ها معنا می‌دهد.

این قواعد ادامهٔ الگوی موجود‌اند: publication permission grant را ثبت می‌کند و snapshot را در همان transaction می‌سازد (`origin/main:implementation/core/publication-service.ts:30-54,141-157`)؛ exporter نیز content را از eventهای `published_content` استخراج می‌کند (`origin/main:implementation/public-export/builder.ts:157-181,191-218`).

## 11. K9 — موارد خارج از دامنه

- Push notification
- پرداخت، checkout، سبد خرید یا سفارش
- inventory، stock، capacity یا رزرو
- اپ native
- recommendation شخصی یا product recommendation
- scraping عکس از اینترنت، شبکهٔ اجتماعی یا وب‌سایت کسب‌وکار
- CDN/object storage خارجی در اجرای نخست
- image editing یا تولید asset واقعی در این مرحله
- analytics، CRM یا consent/session/intent persistence
- تغییر schema، migration، Core service، Public Export، Nginx یا V2 در K1

## 12. معیار آماده‌بودن برای CCR بعدی

K2 فقط وقتی شروع شود که مالک دست‌کم K-D1، K-D3، K-D5، K-D6، K-D7، K-D12 و K-D14 را صریحاً تصمیم دهد. CCR باید مدل فیزیکی، FKهای tenant-safe، constraint قیمت/on-request، ترتیب media، snapshot allowlist، artifact schema، اندازه‌ها، migration forward/rollback و rollout دو artifact را freeze کند. تا آن زمان این سند DRAFT و فاقد مجوز پیاده‌سازی است.

من کدکس هستم
