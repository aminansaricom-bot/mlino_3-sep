# طبقه‌بندی اقتدار اسناد پشتیبان معماری Opportunity

**وضعیت: FORMALLY FROZEN (فاز ۳D).** طبق دستور صریح بخش ۹ فاز ۳D: نه هر سند فاز ۳C به‌طور خودکار منجمد می‌شود. سلسله‌مراتب اقتدار زیر، مرجع نهایی برای حل هر تعارض احتمالی بین این اسناد و ADR/IC رسمی است.

---

| سند | وضعیت (STATUS) | سطح اقتدار (AUTHORITY LEVEL) | دلیل (WHY) | چه چیزی بر آن اولویت دارد (WHAT OVERRIDES IT) |
|---|---|---|---|---|
| `OPPORTUNITY_ARCHITECTURE_SPEC_v2.md` | Frozen Supporting Document | **REFERENCE** | پاسخ عملیاتی به ۱۹ پرسش طراحی (هویت، چرخه‌ی عمر، مالکیت)؛ خودش اقتدار نمی‌سازد، فقط تصمیمات ADR-00AC را عملیاتی می‌کند | ADR-00AC؛ IC-13 |
| `OPPORTUNITY_LIFECYCLE_AND_CONTRACTS_v2.md` | Frozen Supporting Document | **REFERENCE** | اکنون عمدتاً ارجاع‌دهنده به IC-13/IC-14 است، نه منبع اصلی تعریف قرارداد | IC-13؛ IC-14؛ ADR-00AC؛ ADR-00AE |
| `OPPORTUNITY_PRODUCER_BOUNDARIES_v2.md` | Frozen Supporting Document | **REFERENCE** | مرزهای عملیاتی هر Value Engine؛ اقتدار واقعی از الحاقیه‌ی Kernel و ADR-00AD می‌آید، نه از این سند | ADR-00AD؛ الحاقیه‌ی Kernel v1.3 |
| `ROLE_AWARE_CONTEXT_DELIVERY_v2.md` | Frozen Supporting Document | **REFERENCE** | توضیح مفهومی سه‌مرحله‌ای تحویل؛ قرارداد فنی الزام‌آور در IC-14 است | ADR-00AE؛ IC-14 |
| `PROACTIVE_AWARENESS_AND_MATERIALITY_v2.md` | Frozen Supporting Document | **REFERENCE** | تفصیل مکانیزم Materiality؛ تصمیم الزام‌آور (قابل‌مقایسه‌بودن فقط درون‌خانواده) در ADR-00AD و IC-14 ثبت شده | ADR-00AD؛ IC-14 |
| `V1_VALUE_ENGINE_CONTRACTS_v2.md` | Frozen Supporting Document | **IMPLEMENTATION-GUIDANCE** | نزدیک‌ترین سند به آماده‌سازی Feature Contract واقعی؛ برای Phase 4 مفید است اما خودش اقتدار معماری نیست | IC-13؛ IC-14؛ ADR-00AC/AD/AE |
| `V1_HUMAN_ACTION_BOUNDARY_v2.md` | Frozen Supporting Document | **REFERENCE** | بازبیان زنجیره‌ی هشت‌مرحله‌ای برای زمینه‌ی Opportunity؛ اقتدار واقعی همان ADR-00X (بدون تغییر) و AC-4 است | ADR-00X (موجود، بدون تغییر)؛ AC-4 |
| `CONTEXTUAL_CONVERSATION_BINDING.md` | Frozen Supporting Document (بدون نیاز به اصلاح در فاز ۳C) | **REFERENCE** | اصل «گفتگو منبع حقیقت نیست» را عملیاتی می‌کند؛ اقتدار از Kernel §۸ می‌آید | Kernel §۸ |
| `FEATURE_CONTRACT_EXECUTION_ECONOMICS_AMENDMENT.md` | Frozen Supporting Document | **IMPLEMENTATION-GUIDANCE** | یک الحاقیه‌ی رویه‌ای/مستندسازی به قالب Feature Contract، نه یک تصمیم معماری Kernel-سطح | هیچ‌کدام (Category B — جزئیات پیاده‌سازی داخلی، طبق `handoff/ARCHITECTURE_RULES.md`) |
| `LEGACY_HYBRID_BOUNDARY.md` | Frozen Supporting Document | **IMPLEMENTATION-GUIDANCE** | طبقه‌بندی REUSE/WRAP/ADAPT مؤلفه‌های Malino؛ راهنمای پیاده‌سازی، نه معماری Kernel-سطح | راهبرد HYBRID (فاز ۳A)؛ ADR-00AD (برای مرز تولیدکننده) |

## اسناد HISTORICAL (نسخه‌های قبلی، جایگزین‌شده)

نسخه‌های غیر-`_v2` این ده سند (در ریشه‌ی `C:\mlino code\`، از فاز ۳B) اکنون **HISTORICAL** هستند — برای ردیابی تصمیم حفظ شده‌اند اما دیگر مرجع عملیاتی نیستند؛ نسخه‌ی `_v2` (یا معادل رسمی‌شده در این baseline) جایگزین آن‌هاست. همچنین سه `ADR_Candidate_*.md` اصلی (فاز ۳B) و سه `ADR_Candidate_*_v2.md` (فاز ۳C) اکنون HISTORICAL هستند — جایگزین‌شده توسط ADR-00AC/00AD/00AE در `governance/`.

## قاعده‌ی کلی حل تعارض

**Kernel → ADR پذیرفته‌شده → Interaction Contract پذیرفته‌شده → این اسناد REFERENCE/IMPLEMENTATION-GUIDANCE.** اگر هر تعارضی بین این جدول و ADR/IC رسمی مشاهده شود، ADR/IC رسمی برنده است — این جدول هرگز مرجع مستقل معماری محسوب نمی‌شود.
