# گزارش تحویل — پیاده‌سازی `ExternalWorkspaceLink` (گام ۲ نقشه‌ی راه)

**تاریخ:** ۱۰ سپتامبر ۲۰۲۶
**نویسنده:** یونس (Claude)
**دستور:** تصویب نهایی CCR + تصمیم OD-11
**دامنه:** دقیقاً همان چیزی که مجاز شد — شِما، migration، سرویس دامنه، تست، سند

---

## A. تغییرات شِما

یک مدل و سه enum **جدید** به `prisma/schema.prisma` افزوده شد. **هیچ مدل موجودی تغییر نکرد.**

```prisma
enum ExternalSystem     { CONTENT_STUDIO }
enum ExternalLinkStatus { ACTIVE  REVOKED }
enum ExternalLinkBasis  { MANUAL  SYSTEM_MIGRATION  ADMIN_ACTION  INTEGRATION }

model ExternalWorkspaceLink {
  id, organizationId, system, externalWorkspaceId,
  status (default ACTIVE), basis,
  linkedAt, linkedByActorId, revokedAt?, revokedByActorId?, note?
  @@index([organizationId])
  @@index([system, externalWorkspaceId])
  @@map("external_workspace_links")
}
```

`prisma validate` → معتبر.

**Drift روی فایل منجمد، دقیقاً افزودنی است:** `git diff` نشان می‌دهد **۵۶ خط افزوده، صفر خط حذف‌شده**.

نکته‌ای که ارزش ثبت دارد: اجرای اولیه‌ی `prisma format` قالب‌بندی همه‌ی مدل‌های موجود را هم عوض کرده بود (۱۰۴ افزوده / ۴۸ حذف). از نظر معنایی هیچ تفاوتی نداشت — با نرمال‌سازی فاصله‌ها، هیچ خطی فقط در نسخه‌ی قدیمی نبود. ولی روی یک **فایل منجمد**، بازبین با چک‌سام و diff قضاوت می‌کند، و یک diff پر از تغییر قالب‌بندی، تشخیص Drift واقعی را سخت می‌کند. پس قالب اصلی بازگردانده شد و فقط بلوک جدید افزوده ماند.

## B. SQL دقیق migration

`prisma/migrations/20260910020000_add_external_workspace_link/migration.sql`

سه `CREATE TYPE`، یک `CREATE TABLE`، دو ایندکس معمولی، و این ناوردا:

```sql
CREATE UNIQUE INDEX "external_workspace_link_active_unique"
    ON "external_workspace_links"("system", "external_workspace_id")
    WHERE "status" = 'ACTIVE';
```

**چرا SQL خام لازم است — مستند در خودِ فایل migration:**

`@@unique([system, externalWorkspaceId])` در Prisma این ناوردا را بیان **نمی‌کند**: یکتایی را روی *همه‌ی* ردیف‌ها اعمال می‌کند و در نتیجه دومین پیوند تاریخی روی همان workspace را غیرممکن می‌سازد. یعنی یا ناوردا را می‌شکند یا تاریخچه را — هر دو غیرقابل‌قبول.

Prisma تا این نسخه ایندکس یکتای **جزئی** را در زبان شِما پشتیبانی نمی‌کند.

**چرا بررسی اپلیکیشنی جایگزین نشد:** یک بررسی «اول بخوان بعد بنویس» در برابر همزمانی امن نیست. دو تراکنش می‌توانند هم‌زمان خالی‌بودن را ببینند و هر دو یک پیوند فعال بسازند — نتیجه: **دو سازمان مالک یک workspace**، که مستقیماً مرز AC-2 را می‌شکند.

**رفتار بازگشت** هم در همان فایل نوشته شد: پیش از داده‌ی واقعی حذف کامل؛ پس از آن فقط `REVOKED` کردن پیوندها و غیرفعال‌سازی resolve، چون حذف جدولی که تاریخچه‌ی حاکمیتی دارد همان ممیزی‌پذیری را نابود می‌کند.

## C. فایل‌های تغییریافته

| فایل | SHA-256 |
|---|---|
| `implementation/prisma/schema.prisma` | `e1c79133597fcaadc2848c692e6651806df43fac6ecdade44378eeb2a86e3b8a` |
| `implementation/prisma/migrations/20260910020000_add_external_workspace_link/migration.sql` | `7b00129a49f4430382b2b1f8fcbde9cdd0d583ea371cc9cbd55fd173252b4ac5` |
| `implementation/foundation/workspace-link/workspace-link.service.ts` | `bfc132a84dfc5c8e00959cefeb6d4f885f0035e467785e333e17255eb44fd041` |
| `implementation/test/foundation/workspace-link.spec.ts` | `7b03c563ef671b196455c7cb346efb6afe5f94c69debef688ffd492dfaf2f1f8` |
| `implementation/remediation/.../CONTRACT_CHANGE_REQUEST_EXTERNAL_WORKSPACE_LINK.md` | `896948b4ed957e640620277ea14b01074d4bf4be84e2411d401d4c8987f0440c` |

به‌علاوه‌ی `mlino_book/`: وضعیت فعلی، نقشه‌ی راه، دفتر تصمیم‌ها، Changelog.

## D. تست‌ها

```
npx jest test/foundation/workspace-link.spec.ts  →  ۱۷ موفق
npx jest (کل Suite)                              →  ۲۱۰ موفق در ۱۸ فایل
tsc --noEmit                                     →  Exit 0
npm run build                                    →  موفق
prisma migrate status                            →  Database schema is up to date
```

**۲۱۰ = ۱۶۲ پایه + ۳۱ قرارداد پیشنهاد + ۱۷ نگاشت — صفر رگرسیون.**

## E. اثبات ناوردای «حداکثر یک پیوند فعال»

**۱. ایندکس واقعاً در دیتابیس هست** — خوانده‌شده از `pg_indexes`، نه فرض:

```
external_workspace_link_active_unique |
CREATE UNIQUE INDEX external_workspace_link_active_unique
  ON public.external_workspace_links USING btree (system, external_workspace_id)
  WHERE (status = 'ACTIVE'::"ExternalLinkStatus")
```

**۲. تستی که لایه‌ی سرویس را کاملاً دور می‌زند.** با `prisma.externalWorkspaceLink.create` مستقیم یک پیوند فعال دوم می‌سازد. اگر ناوردا فقط یک بررسی اپلیکیشنی بود، این موفق می‌شد — رد می‌شود.

**۳. تست مکمل:** دو workspace متفاوت می‌توانند هم‌زمان پیوند فعال داشته باشند، و یک سازمان می‌تواند چند workspace داشته باشد. ایندکس بیش از حد سخت‌گیر نیست.

## F. رفتار لغو و وصل دوباره

| رفتار | تست |
|---|---|
| پس از لغو، resolve دقیقاً مثل «هرگز پیوند نداشت» | ✅ |
| ردیف حذف نمی‌شود؛ بازیگر و زمان لغو ثبت می‌شوند | ✅ |
| وصل دوباره یک رکورد **جدید** می‌سازد | ✅ تاریخچه دو ردیف دارد، فقط یکی `ACTIVE` |
| `REVOKED → ACTIVE` هرگز رخ نمی‌دهد | ✅ |
| لغو پیوند ناموجود → خطای صریح، نه شکست خاموش | ✅ |
| پس از لغو، پیوند تازه روی همان workspace مجاز است | ✅ |

**ناوردای هویت تاریخی** با تستی اثبات شد که یک workspace را از سازمانی به سازمان دیگر منتقل می‌کند و سپس هر دو بازه‌ی زمانی را می‌پرسد. `organizationAt(system, id, T)` برای بازه‌ی اول سازمان اول را برمی‌گرداند — **حتی با اینکه آن پیوند حالا لغو شده**.

## G. ملاحظات بازگشت

**پیش از هر داده‌ی واقعی:** `DROP INDEX / TABLE / TYPE` — بازگشت کامل و بی‌هزینه. هیچ مدل موجودی تغییر نکرده، پس چیزی نمی‌شکند.

**پس از داده‌ی واقعی:** جدول حذف نمی‌شود. همه‌ی پیوندها `REVOKED` می‌شوند و resolve غیرفعال می‌گردد؛ سیستم به رفتار fail-closed امروز برمی‌گردد ولی تاریخچه می‌ماند.

**نقطه‌ی بی‌بازگشت:** اولین پیوند واقعی.

## H. مستندات

CCR به `APPROVED` (نسخه‌ی ۳) رفت با سه بخش جدید: وضعیت `POLICY DEFINED / ENFORCEMENT DEFERRED`، ناوردای هویت تاریخی، و معناشناسی وصل دوباره.

`mlino_book`: گام ۲ به `IMPLEMENTED / VALIDATED`، تست‌ها ۲۱۰، تصمیم‌های D-26 تا D-29، و OD-12 برای راهبرد اجرای آینده.

## I. تعارض‌ها و موارد باز جدید

**هیچ تعارض جدیدی پیدا نشد.**

**یک مورد باز جدید — OD-12:** راهبرد اجرای آینده‌ی سیاست حذف `workspace`. قاعده مستند است ولی هیچ سازوکاری اجبارش نمی‌کند و V1 از حذف خبردار نمی‌شود. صریح ثبت شد تا کسی فرض نکند سیستم تضمینش می‌کند.

**یک مشاهده که ارزش ثبت دارد:** `prisma migrate deploy` هشدار ارتقای نسخه‌ی اصلی Prisma می‌دهد. مهاجرت با موفقیت اعمال شد و کاری نکردم — ارتقای Prisma یک تصمیم جداست و در دامنه‌ی این کار نبود.

## رعایت دامنه

| مجاز | انجام شد |
|---|---|
| تغییر شِما برای `ExternalWorkspaceLink` | ✅ فقط افزودن، بدون لمس مدل موجود |
| migration لازم | ✅ |
| سرویس دامنه برای نگاشت | ✅ |
| تست متمرکز | ✅ ۱۷ تست |
| به‌روزرسانی سند | ✅ |

| ممنوع | وضعیت |
|---|---|
| تغییر شِمای Content Studio | ✅ انجام نشد |
| همگام‌سازی با Content Studio | ✅ انجام نشد |
| گسترش `EventLog` | ✅ دست‌نخورده |
| اجرای حذف `workspace` | ✅ انجام نشد — عمداً موکول |
| اتصال دیتابیس پیشنهاد | ✅ انجام نشد |
| یکپارچه‌سازی V2 | ✅ انجام نشد |
| بازآرایی نامرتبط | ✅ انجام نشد |

**OD-09 بدون تغییر BLOCKED** — این کار در V1 بود و هیچ وابستگی به مخزن Content Studio نداشت.
