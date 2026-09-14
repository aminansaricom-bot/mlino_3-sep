# گزارش تحویل G13C — نهایی‌سازی قرارداد خواندن V2

## ۱. شناسه و وضعیت

- `INSTRUCTION_ID`: `CODEX-20260914-G13C-V2-READ-CONTRACT-FINAL-001`
- `TARGET_HANDOFF_ID`: `HANDOFF-20260914-OWNER-APPROVAL-V2-READ-CONTRACT-DECISIONS`
- شاخه: `codex/v2-read-contract-design`
- وضعیت: `DELIVERED_AWAITING_GUARDIAN_REVIEW`
- Commit سند نهایی: `bb0452f0aa723b1dff842824acfd3bd63c17bbbe`

## ۲. پیش‌شرط‌های GW2-P

`git fetch origin` با خطای `SEC_E_NO_CREDENTIALS` ناموفق بود. برای هر دو فایل pinned این خروجی‌ها ثبت شد:

| مرجع | `cat-file` | ancestor نسبت به `origin/main` | SHA-256 بایت‌های `git show` | نتیجه |
|---|---:|---:|---|---|
| `aaf878ee1dad4cb379a3007137dd174ddc92f2a1:AI_HANDOFF/CLAUDE_REVIEWS/20260914_OWNER_APPROVAL_V2_READ_CONTRACT_DECISIONS.md` | 0 | 0 | `4e1e89b0ee1d85648f28db28eeaea1997b64c3b5ec9358eeabff4d2debc6fdfd` | PASS |
| `2fa30575b765179b8bf57ad1c139494b074bc36a:AI_HANDOFF/CLAUDE_REVIEWS/20260914_CLAUDE_REVIEW_G13B_V2_READ_CONTRACT_DESIGN_FIXES.md` | 0 | 0 | `6435986cad9886b2b7fb91c66a4a8c9ba4762b8d03baa6c5540882984494ac9f` | PASS |

هیچ credential، token، credential helper یا git config لمس نشد.

## ۳. جدول اجرای D1 تا D4، N1 تا N5 و P1

| شناسه | بخش تغییرکرده | وضعیت |
|---|---|---|
| D1 | سرآیند سند و مرجع تصویب | اعمال شد؛ وضعیت FINAL و مرجع owner approval اضافه شد |
| D2 | بخش ۱۲، جدول تصمیم‌ها | اعمال شد؛ S16 تا S26 به DECIDED رسیدند و گزینه‌های ردشده با `not chosen` باقی ماندند |
| D3 | بخش ۳ fidelity | اعمال شد؛ S19=A1 با تعریف JSONB/NULL-CHECK/snapshot/immutability و A2 به‌عنوان انتخاب‌نشده ثبت شد |
| D4 | بخش ۷ DTO | اعمال شد؛ `public-business.v1`، envelope امضاشده، allowlist تماس، Capability تأییدشده، OfferVersion، stale/order و حذف category/floor/building/products ثبت شد |
| N1 | سرآیند و وضعیت تصمیم‌ها | اعمال شد؛ عبارت قدیمی S16-S20 حذف شد |
| N2 | بخش ۵ | اعمال شد؛ exposure Capability به S18-A ارجاع می‌دهد و S14-A را با exposure عمومی قاطی نمی‌کند |
| N3 | بخش‌های ۷ و ۱۰ | اعمال شد؛ links، freshness، publication metadata و ordering در DTO/consistency پوشش داده شد |
| N4 | گزینه‌های B و C در بخش ۳ | اعمال شد؛ هر دو service-only معرفی شدند و CCR فقط برای guard سطح DB لازم دانسته شد |
| N5 | جدول بخش ۱۲ | اعمال شد؛ S25 و S26 شماره‌گذاری و تصمیم‌شده ثبت شدند |
| P1 | بخش ۱۳ | اعمال شد؛ G14a، G14b و G14c با scope، فایل‌ها، ممنوعیت‌ها، آزمون و rollback به‌عنوان proposal-only اضافه شدند |

## ۴. تصمیم‌های نهایی اعمال‌شده

- S16-A: claim تعلیق یا منقضی‌شده فوراً از خروجی عمومی حذف می‌شود.
- S17-B: export امضاشده و versioned؛ API بعداً همان DTO را ارائه می‌کند.
- S18-A: فقط Capability با `HUMAN_CONFIRMED` عمومی است؛ publish unconfirmed در Core همچنان مجاز اما پنهان است.
- S19-A1: `publications.published_content` با NULL-CHECK برای PUBLISHED/WITHDRAWN، snapshot allowlist‌شده در همان transaction و immutable trigger.
- S20-A: freshness در زمان read با policy versioned.
- S21-B: DTO typed/versioned؛ فیلد جدید Profile فقط با CCR جدا.
- S22-A: allowlist عمومی برای contact و policy privacy.
- S23-B: propagation withdrawal حداکثر ۵ دقیقه با export cycle یا invalidation فوری و stale marker.
- S24-B: خلاصهٔ public از capability links، فقط برای Capabilityهای S18-A.
- S25: حذف category/floor/building از `public-business.v1`; mapping category به vocabulary نسخه‌دار module در آینده.
- S26: حذف products از قرارداد واقعی؛ Offer/OfferVersion جایگزین؛ draft-1 فقط Mock.

## ۵. مانیفست سند نهایی

هش بایت‌های `git show`:

`mlino2/MLINO_V2_READ_CONTRACT_DESIGN.md  4fff41d4247d1c6d1b7b6a90cb2c0b527d5d7604a8f0ce0aefcab04660e4071a`

## ۶. دامنهٔ تغییر

فقط سند طراحی تغییر کرده است. هیچ code، test، config، schema، migration، Prisma، Docker، database، شاخهٔ V2 اصلی، main یا `_PUSH_STAGING` تغییر نکرده است.

## ۷. اعتبارسنجی

این task document-only بود. هیچ test، build، Prisma، Docker یا database اجرا نشد. بررسی ساختاری و `git diff --check` موفق بود.

## ۸. گزارش consistency و fidelity

قانون read آخرین PUBLISHED بدون WITHDRAWN بعدی را با ترتیب `occurred_at` سپس `id` ثبت می‌کند. Snapshot OfferVersion نیز برای یکنواختی قرارداد لازم دانسته شد. A2 به‌عنوان projection مشتق‌شدهٔ آینده ثبت شده و تصمیم S19-A1 را باز نمی‌کند.

## ۹. برنامهٔ بعدی

G14 شامل سه گام پیشنهادی است، اما هیچ‌کدام مجوز اجرا ندارند: G14a CCR و migration برای `published_content`، G14b producer خروجی signed V1، و G14c انتقال consumer V2 به `public-business.v1`.

## ۱۰. توقف

پس از Push، Codex متوقف می‌شود و منتظر Guardian review می‌ماند. هیچ G14 یا implementation خودکار آغاز نمی‌شود.

من کدکس هستم.
