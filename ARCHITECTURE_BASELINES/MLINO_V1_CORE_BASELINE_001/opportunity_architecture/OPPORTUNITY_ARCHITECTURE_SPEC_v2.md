# سند A (اصلاح‌شده) — مشخصات معماری Opportunity

**وضعیت: FREEZE CANDIDATE.** اصلاح‌شده از [OPPORTUNITY_ARCHITECTURE_SPEC.md](../OPPORTUNITY_ARCHITECTURE_SPEC.md). فقط بندهای زیر تغییر کرده‌اند؛ باقی بندها (C، D، E، F، H، I، J، K، N، O، P، Q، R، S) بدون تغییر معتبرند.

---

**B. هویت آن چیست؟ (اصلاح‌شده)**
چهار مفهوم مجزا، نه یکی: `id` (هویت هر ردیف Event)، **`opportunity_correlation_id`** (= `id` رویداد Occurrence بنیان‌گذار، پایدار در طول کل چرخه‌ی عمر — هویت واقعی Opportunity)، `unique_key` (فقط Idempotency)، هش محتوا (نسخه، مختص هر رویداد). جزئیات کامل در [ADR_Candidate_Opportunity_Architecture_v2.md](ADR_Candidate_Opportunity_Architecture_v2.md).

**D. چه چیزی Opportunity می‌سازد؟ (اصلاح‌شده)**
یک **تولیدکننده‌ی سیگنال دامنه (Domain Signal Producer)** ثبت‌شده — نام Kernel-سطح این نقش، طبق [MLINO_KERNEL_MINIMAL_AMENDMENT_VALUE_ENGINE_PRODUCERS.md](MLINO_KERNEL_MINIMAL_AMENDMENT_VALUE_ENGINE_PRODUCERS.md). «Value Engine» نام محصولی همان نقش برای V1 است.

**G. کدام وضعیت‌های چرخه‌ی عمر برای V1 لازم است؟ (اصلاح‌شده)**
دو لایه‌ی مجزا: (۱) وضعیت **سراسری** خود Opportunity — فقط فعال یا `EXPIRED`؛ (۲) وضعیت **مختص هر actor** — `SEEN`/`ACKNOWLEDGED`/`DISMISSED`، ذخیره‌شده به‌عنوان رکورد تعامل جداگانه. جزئیات کامل در [OPPORTUNITY_LIFECYCLE_AND_CONTRACTS_v2.md](OPPORTUNITY_LIFECYCLE_AND_CONTRACTS_v2.md).

**L. شواهد پشتیبان چگونه ارجاع داده می‌شوند؟ (تصریح اضافه‌شده، بدون تغییر مکانیزم)**
`evidence_refs[]`، بدون تغییر. **تصریح صریح (طبق بخش ۱۹ فاز ۳C):** این یک پاسخ حداقلی و کافی برای V1 است؛ مفهوم بزرگ‌تر محصولی «Context» (شامل روابط، تاریخچه، اهداف، محدودیت‌ها) و «Reality» (شامل بیش از Eventها) جایگزین یا بازتعریف نمی‌شوند — این معماری فقط حداقل پیوند شواهد لازم برای Opportunity را پیاده می‌کند، نه کل چشم‌انداز محصولی Reality/Context.

**R. تأیید/رد انسانی چگونه نمایش داده می‌شود؟ (اصلاح‌شده)**
یک رکورد تعامل مختص actor (`domain_tag: "opportunity.interaction"`)، نه یک Amendment سراسری روی خود Opportunity. **تصریح صریح و الزامی (طبق بخش ۲۱ فاز ۳C):** این تأیید، تحت هیچ شرایطی، معادل پذیرش Recommendation، مجوز اجرا، یا اجرای هر اقدامی نیست — جزئیات کامل در [V1_HUMAN_ACTION_BOUNDARY_v2.md](V1_HUMAN_ACTION_BOUNDARY_v2.md).

---

## آنچه در این اصلاح تغییر نکرد

طبقه‌بندی بنیادین (Opportunity = مصنوع Event-Sourced، نه موجودیت Core، نه Capability) دست‌نخورده است — بازبینی نهایی این تصمیم را تأیید کرد، نه رد.
