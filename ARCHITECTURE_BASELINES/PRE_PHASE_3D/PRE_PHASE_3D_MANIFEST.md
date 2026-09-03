# مانیفست عکس فوری پیش از فاز ۳D

**زمان ایجاد:** 2026-08-14T02:53:04Z (UTC)
**دلیل ایجاد:** طبق دستور صریح بخش ۳ فاز ۳D — قبل از هرگونه تغییر در فایل‌های معماری معتبر، یک عکس فوری تغییرناپذیر لازم است تا انجماد **مخرب** نباشد.

## منبع فایل‌ها

فایل‌ها مستقیماً از چهار بسته‌ی اصلی تحویلی کاربر بازاستخراج شدند (نه از کپی کشف‌شده‌ی بسته‌ی NestJS در فاز ۳A، طبق محدودیت صریح بخش ۲۰ فاز ۳D: «منشأ آن بسته هنوز تأیید نشده؛ معماری نباید به آن گره بخورد»):

- `MLINO_full_extract(1).zip` و `MLINO_COMPLETE_PROJECT(1).zip` (محتوای `architecture/`، `governance/`، `capabilities/` در این دو بسته یکسان است — با `diff -rq` تأیید شد).
- `MLINO_PreImplementation_Architecture_Pack_v0.2 (1).zip` (منبع `SOURCE_OF_TRUTH_MAP.md`).

## وضعیت معماری پیش از فاز ۳D

Kernel v1.2 (Frozen)، Capability Map v1.0 (Frozen)، ۱۱ مشخصات Capability (۸ Frozen، ۲ Deferred، طبق فاز ۱)، Interaction Contracts v1.0 (Frozen، ۱۲ قرارداد)، ۵ ADR حاکمیتی (ADR-00X تا ADR-00AB)، Migration Plan v1.0 (Frozen). هیچ معماری Opportunity در این نسخه وجود ندارد — این دقیقاً همان نقطه‌ای است که فاز ۳B/۳C/۳D بر آن ساخته می‌شوند.

## فهرست فایل و SHA-۲۵۶

| فایل | SHA-256 |
|---|---|
| `01_AUTHORITY/SOURCE_OF_TRUTH_MAP.md` | `45da78168044d5aa7bc4e89068f179f043816bad5508ccb2caf2c77bcad33edd` |
| `architecture/Interaction_Contracts_v1.0_FROZEN.md` | `58a7a63c58ea3ca4c68dce6e3d016682bc67438ed83d030a0eeb46a2a741ab67` |
| `architecture/Kernel_Architecture_v1.2_FROZEN.md` | `ecfcca1036778b792faf5e0e141c08eb4c8d592c6f1a1f650af3f4df958be4cd` |
| `architecture/MLINO_Capability_Map_v1_FROZEN_FINAL.md` | `8432aefe957c871f75622e4005e1ccb4d8cea0b5796f24703e1243f9d79c5631` |
| `architecture/MLINO_Migration_Plan_v1.0_FROZEN.md` | `c25a01089e54a699e4619c1ba3b06672e59853feb1a14537ef29cce13320fce8` |
| `architecture/architecture00_SYSTEM_OVERVIEW.md` | `f5b7cf8ddf1a398f3c0e7972731886d78f777b81bc352a0c7bbb2f37e82baac5` |
| `capabilities/01-memory-and-knowledge.md` | `8fe5cef639c29523a3a2e10ae4f2122122af9ada85ec8785eec13905770a4368` |
| `capabilities/02-domain-adaptation-and-semantic-translation.md` | `dd336448fd348a927fac56b85e201c0cf356f7d3ded241d8551d5de06d6b6ad1` |
| `capabilities/03-reasoning-and-causal-analysis.md` | `2503482bb1e89bb0d7b149206fd391ddabb13bf9f1564f146a78e7b3b7ef648d` |
| `capabilities/04-goal-alignment-and-strategy.md` | `d8d6cfaea655a2ccb7540dfc30ab7d69f73f5b24f57f902d59deb04def293abf` |
| `capabilities/05-prediction-and-simulation.md` | `5ccb9eeb685b8c2bccb9c9a22a8dbbb8488e692b75e312162d5a0aba36c4367a` |
| `capabilities/06-decision-support-and-recommendation.md` | `e16564323ffdb9b065357b90a2d267e6e59a28b9af43f1d5ab5b2838d38f09e3` |
| `capabilities/07-communication-and-narrative.md` | `386571bc18d68e28f39ec8ad99f2ad2eb5f258a7e4a37e4d3db1208b05012018` |
| `capabilities/08-data-ingestion-and-integration.md` | `7f123b3c5d9e101459bd1500ae402f86d44e5c4587ace502b369b95d2e3863f7` |
| `capabilities/09-action-and-execution.md` | `ecd0cc5693f9e088f4ce0956f9fe68addde155372ad44bac3a37fa6b9d9ed534` |
| `capabilities/10-learning-and-feedback.md` | `51555e78b931445926b62694b0b6bc4f9d5de7675ddf142da5a9f9f2d5c1d270` |
| `capabilities/11-trust-explainability-and-governance.md` | `b6ffeb02157ff8108441e93ee8c04c9995bca9d4b0f48256df426a486e96926a` |
| `governance/ADR-00AA-Goal-Alignment-Scope.md` | `60decf5ca9c57807d17d21964a43415dee00e49e13472cdc564bad05c5de693f` |
| `governance/ADR-00AB-Memory-Integrity.md` | `3105bd5a2c11d2f9128b00676349da030df25df0d8287d5c10bc56bdaad2abe8` |
| `governance/ADR-00X-Human-Authorization-Gate.md` | `38cef827a3d4ddb0351b64ba7ad47979842ff7f638d1a6bace126f1b66292561` |
| `governance/ADR-00Y-Resolution-Trace-Sufficiency.md` | `0fc92c601f59df6a3f9f9f8fc8ce811016d9f175205e70740a223a67e7ec5178` |
| `governance/ADR-00Z-Producer-Validator-Separation.md` | `b768bf7975dafbaf211a25f96413f1f4b0005578459546510feb0d2d39ce5678` |
| `governance/Governance-Foundation-Index.md` | `2c8da15b92f08231657fbcd9562cd82a9fe7a26c863de50dce474fa8effc972c` |
| `governance/Kernel-v1.2-Governance-Compliance-Audit.md` | `b5a189ecdf2a7a4da17f348b62f8f2ee79c5c5049ebe1248b36ad47ad14477a6` |

## یادداشت اطلاعاتی — واگرایی نسخه‌ی محتوا با بسته‌ی کشف‌شده‌ی NestJS

`capabilities/09-action-and-execution.md` در این عکس فوری (بازاستخراج از بسته‌های اصلی) هش متفاوتی نسبت به فایل هم‌نام در بسته‌ی NestJS کشف‌شده‌ی فاز ۳A دارد (`4f1c47f5554480cf877b9034e1738f08f60cf54424b8d1ff4b7e0ba71dd79e66` طبق `RELEASE_MANIFEST.md` آن بسته). این تأیید می‌کند که این دو کپی از معماری از یکدیگر واگرا شده‌اند — دلیل دیگری برای این‌که فاز ۳D عمداً از بسته‌های اصلی تحویلی کاربر به‌عنوان منبع عکس فوری استفاده کرد، نه از بسته‌ی NestJS با منشأ نامعلوم.

## تغییرناپذیری

این پوشه پس از ایجاد ویرایش نمی‌شود. هرگونه اصلاح بعدی فقط در `ARCHITECTURE_BASELINES/MLINO_V1_CORE_BASELINE_001/` (نسخه‌ی پس از انجماد) اعمال می‌شود.
