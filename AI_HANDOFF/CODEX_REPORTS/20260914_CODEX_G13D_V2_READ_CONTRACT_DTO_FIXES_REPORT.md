# گزارش تحویل G13D — اصلاح DTO قرارداد خواندن V2

## ۱. وضعیت

- `INSTRUCTION_ID`: `CODEX-20260914-G13D-V2-READ-CONTRACT-DTO-FIXES-001`
- شاخه: `codex/v2-read-contract-design`
- commit سند: `66b18bb5d7d0c3d2bef4cd073a0260fee5e12f11`
- وضعیت: `DELIVERED_AWAITING_GUARDIAN_REVIEW`

## ۲. پیش‌شرط GW2-P

`git fetch origin` با `SEC_E_NO_CREDENTIALS` ناموفق بود. بررسی pinned review موفق شد:

| بررسی | نتیجه |
|---|---|
| `git cat-file -e b5210263fa0b16703fc62d23a8b2825f1b7b8293^{commit}` | `CAT_FILE=0` |
| `git merge-base --is-ancestor b5210263fa0b16703fc62d23a8b2825f1b7b8293 origin/main` | `ANCESTOR=0` |
| SHA-256 بایت‌های `git show` | `21d0a309a61be80d4b6b24d7b24d8f2728443ace9b3f0d003091ccde5ee28867` — برابر pinned |

هیچ credential، token، git config یا helper تغییر نکرد.

## ۳. جدول F1 تا F9

| شناسه | بخش/خط تغییرکرده | وضعیت |
|---|---|---|
| F1 | بخش ۷ DTO | اعمال شد؛ `PublicBusinessExportV1` و `PublicBusinessRecordV1` جدا شدند؛ envelope امضاشده و snapshot atomic ثبت شد؛ ارجاع contract.ts:62-72 و validate.ts:117-134 اضافه شد |
| F2 | بخش ۷ DTO | اعمال شد؛ `signature` اجباری است؛ artifact بدون امضا فقط برای draft-1 Mock مجاز است؛ الگوریتم و مدیریت کلید به G14b موکول شد |
| F3 | بخش ۷ و G14a | اعمال شد؛ `display_name` حذف شد؛ هر content field فقط از `published_content` می‌آید و live-row read ممنوع است؛ display name فقط از Profile snapshot allowlist می‌تواند اضافه شود |
| F4 | بخش ۷ offers | اعمال شد؛ `on_request` از OfferVersion اضافه شد |
| F5 | بخش ۷ capabilities/offers | اعمال شد؛ `capabilities[].capability_links` حذف شد؛ links فقط در offers و با شرط S24-B باقی ماند |
| F6 | بخش ۷ business | اعمال شد؛ `source_revision` به‌عنوان revision منتشرشده اضافه شد |
| F7 | بخش ۷ و قواعد DTO | اعمال شد؛ اگر یکی از مختصات null باشد هر دو null می‌شوند؛ address مستقل است؛ Decimal به number با ۶ رقم اعشار تبدیل می‌شود |
| F8 | بخش ۷ و G14b | اعمال شد؛ `business_hours` و `terms` JSON مطابق schema نسخه‌دار G14b هستند، نه JSON دلخواه |
| F9 | بخش‌های ۲، ۳، ۵، ۶، ۱۲ | اعمال شد؛ stale projection wording، وضعیت S18، عنوان owner decisions، عبارت table above و mappingهای S25/S26/discount اصلاح شدند؛ هیچ تصمیم S بازنویسی نشد |

## ۴. بلوک DTO نهایی

```ts
type PublicBusinessExportV1 = {
  contract_version: 'mlino.v2.public-business.v1';
  generated_at: string; // metadata
  snapshot_id: string; // metadata
  signature: { algorithm: string; key_id: string; value: string }; // required; algorithm/key management deferred to G14b
  records: PublicBusinessRecordV1[];
};

type PublicBusinessRecordV1 = {
  business: {
    organization_id: string; // Organization.id
    name: string;
    description: string | null;
    location: { latitude: number | null; longitude: number | null; address_text: string | null } | null; // S21-B
    contact_information: { public_phone?: string; public_email?: string; public_address?: string } | null; // S22-A
    links: { website?: string; public_social?: string[] } | null; // S21-B
    business_hours: unknown | null; // versioned JSON schema in G14b
    published_at: string;
    publication_id: string;
    source_revision: number;
  };
  capabilities: Array<{
    capability_id: string;
    capability_key: string;
    name: string;
    short_description: string | null;
    fresh_until: string | null;
    source_revision: number;
  }>;
  offers: Array<{
    offer_id: string;
    offer_version_id: string;
    version_number: number;
    name: string;
    short_description: string | null;
    offer_shape: string;
    terms: unknown | null; // versioned JSON schema in G14b
    price_amount: string | null;
    price_currency: string | null;
    on_request: boolean;
    valid_from: string;
    valid_until: string | null;
    capability_links: Array<{ capability_id: string; capability_key: string; name: string }>;
    published_at: string;
    publication_id: string;
  }>;
  stale: boolean; // S20-A / S23-B metadata
  ordering: { primary: 'publication.occurred_at'; tie_breaker: 'publication.id' }; // metadata
};
```

## ۵. هش سند نهایی

`mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md 855aa828e7a29fc799194589574401ad19d893841530174528e2433bae6147fc`

این هش با بایت‌های `git show 66b18bb5d7d0c3d2bef4cd073a0260fee5e12f11:mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md` محاسبه شده است.

## ۶. دامنه و اعتبارسنجی

فقط سند طراحی تغییر کرد. این گزارش و Handoff نیز مستندات تحویل هستند. هیچ code، test، config، schema، migration، Prisma، Docker، database، V2 branch، main یا G14 تغییر نکرد. `git diff --check` موفق بود؛ task document-only بود و تست اجرایی انجام نشد.

## ۷. توقف

پس از Push فقط Guardian review مجاز است. هیچ تصمیم S تغییر نکرد و هیچ G14 آغاز نمی‌شود.

من کدکس هستم.
