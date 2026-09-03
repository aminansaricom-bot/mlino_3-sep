# مانیفست Baseline — MLINO_V1_CORE_BASELINE_001

**شناسه‌ی Baseline:** `MLINO_V1_CORE_BASELINE_001`
**زمان ایجاد:** 2026-08-14T03:12:13Z (UTC)
**وضعیت معماری:** **FROZEN FOR V1 CORE IMPLEMENTATION DESIGN** — به این معنا که عامل‌های پیاده‌سازی نمی‌توانند این معماری را بدون عبور از فرایند رسمی ARCHITECTURE_CHANGE_REQUEST تغییر دهند؛ **به این معنا نیست که معماری MLINO هرگز تغییر نمی‌کند.**
**نسخه/وضعیت اجزای معماری:** Kernel v1.3 (Frozen) | Capability Map v1.0 (Frozen، با یادداشت‌های تصحیح‌شده‌ی G3) | ۱۱ Capability Specification (۸ Frozen، ۲ Deferred) | Interaction Contracts v1.1 (Frozen، ۱۴ قرارداد) | ۸ ADR حاکمیتی (ADR-00X تا ADR-00AE) | Migration Plan v1.0 (Frozen، بدون تغییر)
**عکس فوری پیشین/مرجع:** `ARCHITECTURE_BASELINES/PRE_PHASE_3D/` (تغییرناپذیر)

---

## ADRهای پذیرفته‌شده

ADR-00X، ADR-00Y، ADR-00Z، ADR-00AA، ADR-00AB (زنجیره‌ی حاکمیت هوش مصنوعی، بدون تغییر) + **ADR-00AC، ADR-00AD، ADR-00AE (معماری Opportunity، جدید در فاز ۳D)**.

## Interaction Contracts پذیرفته‌شده

IC-01 تا IC-12 (بدون تغییر) + **IC-13 (ارسال Event Candidate)، IC-14 (تحویل نقش‌آگاه Opportunity) — جدید در v1.1**.

## بازبینی/الحاقیه‌ی Kernel

**v1.2 → v1.3.** الحاقیه‌ی افزودنی به §۶ و §۲۰ (به‌رسمیت‌شناسی تولیدکننده‌ی سیگنال دامنه)، مستند در پیوست ۴. بدون تغییر در هیچ Invariant، Constraint، مالکیت، یا مرز Capability موجود.

## تصمیمات محصولی تلفیق‌شده

PD-V1-01 تا PD-V1-13 (فاز ۳A، بدون تغییر) + اصل Adaptive Execution (Cost-to-Value، بدون ورود به Kernel) + چهار خانواده‌ی Opportunity V1 (ظرفیت، کنسلی/عدم‌حضور، پیگیری، برداشت بازیابی درآمد).

## گپ‌های غیرمسدودکننده‌ی باقی‌مانده

چهار مورد، هرکدام با مالک و فاز آینده‌ی مشخص — جزئیات کامل در `V1_GAP_REGISTRY_POST_FREEZE.md`: سیاست بازارزیابی Materiality، شواهد کهنه، اصلاح داده‌ی زیرین Malino، بررسی تازگی منبع در دروازه‌ی Capability ۶.

## معماری آینده‌ی صریحاً مستثنا‌شده

تماس خودکار بیرونی، رابط صوتی، هوش رسانه‌ی اجتماعی، Content Copilot، تولید آواتار، OCR، اتوماسیون حسابداری/بیمه، پیگیری خودکار بیمار، شبکه‌ی Partner V2، هوش شبکه‌ای/اکوسیستم.

---

## فهرست کامل فایل و SHA-۲۵۶

| فایل | SHA-256 |
|---|---|
| `01_AUTHORITY/SOURCE_OF_TRUTH_MAP.md` | `9bc2de61f5b25f066224f11175263c5613041598ae039b210e48e9ee22160d6f` |
| `ARCHITECTURE_CHANGE_CONTROL_AND_WORKER_BOUNDARIES.md` | `e172519a3e744a36f6a5b0ce39794ab3a790eea3942b0c7ae8b5b90af9c6b871` |
| `V1_FROZEN_ARCHITECTURE_CONSISTENCY_REPORT.md` | `24327f721ebc6a32a22007c405f866eed3cdcf1e3522434a8be28fe0a6218382` |
| `V1_GAP_REGISTRY_POST_FREEZE.md` | `0edd203fcda10d85b9edfa374227105b1764c26ac9fe852f4bfe1f64ca7e15f4` |
| `architecture/Interaction_Contracts_v1.1_FROZEN.md` | `ed897c830dc343692e6f35123ceb286885b2512cb289e49cbf3647b34db9cd90` |
| `architecture/Kernel_Architecture_v1.3_FROZEN.md` | `8420cba7c60a3e01f1fa5815218c95c964d7a7da205a115635e9f99ae73ed55f` |
| `architecture/MLINO_Capability_Map_v1_FROZEN_FINAL.md` | `c8669f7025726f228738c2d92634600b26ec30d0f87e4eff1e4c1952ff02efae` |
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
| `governance/ADR-00AC-Opportunity-Architecture.md` | `d404de6c3d8caf2299c4d9f65bd5ed70ba4584987a7f9399db6b96aaf136f09d` |
| `governance/ADR-00AD-Opportunity-Producer-And-Materiality.md` | `5f733b727597eb19ef2ac7662df72d6194837fb024e650dbdce82696aa77f87c` |
| `governance/ADR-00AE-Role-Aware-Opportunity-Delivery.md` | `8d7f5fcbfab3fc077793d844e993279b0764838d1bc91d01463e4ff45c52b902` |
| `governance/ADR-00X-Human-Authorization-Gate.md` | `38cef827a3d4ddb0351b64ba7ad47979842ff7f638d1a6bace126f1b66292561` |
| `governance/ADR-00Y-Resolution-Trace-Sufficiency.md` | `0fc92c601f59df6a3f9f9f8fc8ce811016d9f175205e70740a223a67e7ec5178` |
| `governance/ADR-00Z-Producer-Validator-Separation.md` | `b768bf7975dafbaf211a25f96413f1f4b0005578459546510feb0d2d39ce5678` |
| `governance/Governance-Foundation-Index.md` | `0a17284b490aa2978c85dc4e9b1decb4b994c7c40f93f52d7979df8e37af426c` |
| `governance/Kernel-v1.2-Governance-Compliance-Audit.md` | `b5a189ecdf2a7a4da17f348b62f8f2ee79c5c5049ebe1248b36ad47ad14477a6` |
| `opportunity_architecture/CONTEXTUAL_CONVERSATION_BINDING.md` | `2695893e2b1907a71a39dcc05e1953660e8e40ac2bd52c2f68e9d00a23bf3793` |
| `opportunity_architecture/DOCUMENT_AUTHORITY_CLASSIFICATION.md` | `b6b178698b0285c712ae930c6c1890a4a0d90c11e729ca8fe5797d72f80d619d` |
| `opportunity_architecture/FEATURE_CONTRACT_EXECUTION_ECONOMICS_AMENDMENT.md` | `91140e1c41ac5f3f99cd9ce2098251dbe5b6a71d6793064c4858224ea3e723a0` |
| `opportunity_architecture/LEGACY_HYBRID_BOUNDARY.md` | `276b5171531fdc858b70fa22c9e54f4f63d46d6a4599bb446469a3612f8d8b8f` |
| `opportunity_architecture/OPPORTUNITY_ARCHITECTURE_SPEC_v2.md` | `7640cf3b3c8340d08553802f1b294e95cc16631e6924084a96abc5dbf1187177` |
| `opportunity_architecture/OPPORTUNITY_LIFECYCLE_AND_CONTRACTS_v2.md` | `108e153a5fe9591783d5fdc79262d106598c95df4a1d1b8ae275bada3204fcfd` |
| `opportunity_architecture/OPPORTUNITY_PRODUCER_BOUNDARIES_v2.md` | `e87e8b7f9aac2921be8eb8e626f26b8d3284bb3c817c895ce71b153112fe3207` |
| `opportunity_architecture/PROACTIVE_AWARENESS_AND_MATERIALITY_v2.md` | `7d4ed08f1e95bf1f4f66bc4a8796f4a77f9b7ca81d70874b599230b7d09defd6` |
| `opportunity_architecture/ROLE_AWARE_CONTEXT_DELIVERY_v2.md` | `eaf2f405aa66d3e22bb9cc7202bc8943ca4ac4b375c34d2981292e1efca27f37` |
| `opportunity_architecture/V1_HUMAN_ACTION_BOUNDARY_v2.md` | `aa32f9060872d2761fcf6518e0524ff712739626e910093b912f746fd20990cc` |
| `opportunity_architecture/V1_VALUE_ENGINE_CONTRACTS_v2.md` | `cd48ddf547f64fcc994b257d27ad1dabb93ac20a3580a8ef5e19f53ae0adef42` |

**۴۱ فایل، همگی از `ARCHITECTURE_BASELINES/PRE_PHASE_3D/` یا `PHASE_3C_FREEZE_CANDIDATE/` مشتق شده، با تغییرات مستند در `V1_FROZEN_ARCHITECTURE_CONSISTENCY_REPORT.md`.**
