/**
 * MLINO Shared Recommendation / Action Contract — v1.0
 *
 * زبان متعارف «پیشنهاد و اقدام» در MLINO V1. سند مرجع محصولی:
 * mlino_book/contracts/SHARED_RECOMMENDATION_CONTRACT.md
 * تصمیم معماری: mlino_book/adr/ADR-0003-shared-recommendation-contract.md
 *
 * دامنه‌ی این فایل عمداً باریک است: فقط **تعریف نوع و دامنه**.
 *   - بدون ذخیره‌سازی، بدون شِمای دیتابیس
 *   - بدون مصرف‌کننده و بدون Adapter
 *   - بدون تغییر در فایل‌های منجمد (`shared-contracts/types.ts`،
 *     `prisma/schema.prisma` هر دو دست‌نخورده‌اند)
 *
 * چرا زیر `foundation/` و نه یک پوشه‌ی سطح‌بالای جدید: `tsconfig.json` از قبل
 * `foundation/**` را شامل می‌شود، پس این قرارداد بدون هیچ تغییر پیکربندی وارد
 * build و typecheck می‌شود. هرچه سطح تماس کمتر، بازبینی آسان‌تر.
 *
 * دو موتور امروز پیشنهاد تولید می‌کنند — `value-engines/` در V1 و
 * `learning/` در Content Studio — و هیچ‌کدام بازنویسی نمی‌شود. این قرارداد
 * زبان بالادستی است که بعداً هر دو از راه Adapter به آن حرف می‌زنند.
 */

import { ActorId, ISOTimestamp, OrganizationId } from '../../shared-contracts/types';

/** شناسه‌ی پایدار یک پیشنهاد. */
export type RecommendationId = string;
/** اشاره به یک رکورد واقعی در سیستم منبع — هرگز متن آزاد توصیفی. */
export type EvidenceReference = string;
/** شناسه‌ی محلی یک شواهد داخل همان پیشنهاد؛ `impact` به همین اشاره می‌کند. */
export type EvidenceId = string;

// ─────────────────────────── نقش‌ها ───────────────────────────

/**
 * یازده نقش مصوب مالک محصول. `target_role` اجباری است: پیشنهادی که نقش مسئول
 * ندارد اقدام نمی‌شود و فقط نویز است.
 *
 * `custom_role` برای کسب‌وکارهایی است که ساختارشان با ده نقش استاندارد
 * نمی‌خواند — و به همین دلیل `custom_role_label` را الزامی می‌کند (بند
 * `validateRecommendation`)، وگرنه دوباره «بدون مسئول» می‌شود.
 */
export const TARGET_ROLES = [
  'owner_founder',
  'executive',
  'general_manager',
  'operations_manager',
  'marketing',
  'sales',
  'customer_service',
  'finance',
  'hr',
  'specialist',
  'custom_role',
] as const;
export type TargetRole = (typeof TARGET_ROLES)[number];

// ─────────────────────────── اثر ───────────────────────────

export const IMPACT_TYPES = [
  'revenue_growth',
  'customer_satisfaction',
  'cost_reduction',
  'efficiency',
  'risk_reduction',
  'brand_growth',
  'retention',
  'quality_improvement',
] as const;
export type ImpactType = (typeof IMPACT_TYPES)[number];

/** ۱ کم · ۲ متوسط · ۳ زیاد · ۴ بحرانی */
export const IMPACT_LEVELS = [1, 2, 3, 4] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

/**
 * ادعای اثر — و شواهدی که پشتش است.
 *
 * `evidence_ref` اجباری است و باید به یکی از اعضای `evidence[]` همان پیشنهاد
 * اشاره کند. ادعای اثر بدون شواهد همان «حدس زدن» است که در کل پروژه ممنوع
 * است: اگر نمی‌توانیم بگوییم بر چه اساسی این را «زیاد» نامیدیم، عددی نمی‌دهیم.
 */
export interface DeclaredImpact {
  readonly impact_type: ImpactType;
  readonly impact_level: ImpactLevel;
  readonly evidence_ref: EvidenceId;
}

// ─────────────────────────── هزینه‌ی انجام ───────────────────────────

/**
 * مقیاس **زمانی** است نه پولی — تنها چیزی که همه‌ی نقش‌ها یکسان می‌فهمند و
 * هیچ موتوری لازم نیست هزینه‌ی ریالی را حدس بزند.
 */
export const EFFORT_SCALE = ['XS', 'S', 'M', 'L', 'XL'] as const;
export type Effort = (typeof EFFORT_SCALE)[number];

export const EFFORT_MEANING: Readonly<Record<Effort, string>> = Object.freeze({
  XS: 'کمتر از یک ساعت',
  S: 'همان روز',
  M: 'چند روز',
  L: 'یک تا دو هفته',
  XL: 'پروژه‌ی راهبردی',
});

// ─────────────────────────── شواهد ───────────────────────────

export const EVIDENCE_KINDS = ['metric', 'event', 'feedback', 'observation'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

/**
 * یک شواهد. `reference` باید به رکورد واقعی منبع اشاره کند؛ `summary` فقط
 * برای خواندن انسان است و جایگزین آن نیست.
 */
export interface RecommendationEvidence {
  readonly evidence_id: EvidenceId;
  readonly kind: EvidenceKind;
  readonly summary: string;
  readonly reference: EvidenceReference;
  readonly observed_at: ISOTimestamp;
}

// ───────────────── تفکیک دامنه: مشاهده ≠ پیشنهاد ≠ اقدام ≠ نتیجه ≠ ارزیابی ─────────────────

/**
 * این پنج مفهوم عمداً **در هم ادغام نشده‌اند**. MLINO باید در نهایت به پنج
 * پرسش متفاوت جواب بدهد و هر کدام یک موجودیت جدا لازم دارد:
 *
 *   Observation   چه اتفاقی افتاد؟              → `RecommendationEvidence`
 *   Recommendation چه کاری باید انجام شود؟      → `Recommendation`
 *   Action        چه کاری واقعاً انجام دادیم؟    → `ActionRecord`
 *   Outcome       چه چیزی عوض شد؟               → `OutcomeRecord`
 *   Evaluation    آیا کسب‌وکار را بهتر کرد؟      → `EvaluationRecord`
 *
 * اگر این‌ها یک موجودیت شوند، سیستم می‌تواند «پیشنهاد دادم» را با «انجام شد»
 * و «مؤثر بود» اشتباه بگیرد — و آن‌وقت هرگز یاد نمی‌گیرد.
 */

export const RECOMMENDATION_STATUSES = [
  'proposed',
  'accepted',
  'in_progress',
  'done',
  'dismissed',
  'expired',
] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

/** چه کاری واقعاً تخصیص داده یا اجرا شد — جدا از خودِ پیشنهاد. */
export interface ActionRecord {
  readonly recommendation_id: RecommendationId;
  readonly assigned_to: ActorId | null;
  readonly assigned_at: ISOTimestamp;
  readonly executed_at: ISOTimestamp | null;
  readonly note: string | null;
}

/** چه چیزی پس از اجرا عوض شد — واقعیت مشاهده‌شده، نه قضاوت. */
export interface OutcomeRecord {
  readonly recommendation_id: RecommendationId;
  readonly observed_at: ISOTimestamp;
  readonly summary: string;
  readonly reference: EvidenceReference;
}

/** آیا آن اقدام مؤثر بود — قضاوت، جدا از خودِ نتیجه. */
export interface EvaluationRecord {
  readonly recommendation_id: RecommendationId;
  readonly evaluated_at: ISOTimestamp;
  readonly effective: boolean | null;
  readonly rationale: string;
}

// ─────────────────────────── دیده‌شدن و اختیار ───────────────────────────

/**
 * `visibility` و `permissions` عمداً دو چیز جدا هستند: «چه کسی می‌بیند» با
 * «چه کسی می‌تواند وضعیت را عوض کند» یکی نیست. هر دو در زمان اجرا از AC-2
 * عبور می‌کنند؛ این‌ها فقط نیت اعلام‌شده‌ی منبع‌اند، نه خودِ مجوز.
 */
export interface RecommendationVisibility {
  readonly roles: readonly TargetRole[];
}

export interface RecommendationPermissions {
  /** کدام نقش‌ها می‌توانند `status` را تغییر دهند. */
  readonly can_change_status: readonly TargetRole[];
}

// ─────────────────────────── تازگی ───────────────────────────

export interface Freshness {
  /** تا چه زمانی شواهد پشت این پیشنهاد معتبر شمرده می‌شوند. */
  readonly evidence_valid_until: ISOTimestamp | null;
}

// ─────────────────────────── خودِ قرارداد ───────────────────────────

export interface RecommendationSource {
  /** `v1_value_engines` | `content_studio_learning` | … */
  readonly system: string;
  readonly engine: string;
  readonly version: string;
}

/**
 * قرارداد نسخه‌ی ۱٫۰.
 *
 * `owner` عمداً اختیاری است و هرگز اجباری نمی‌شود: پیشنهاد نباید به شخص خاص
 * وابسته باشد. نقش از همان ابتدا معلوم است، ولی تخصیص انسانی بعداً انجام
 * می‌گیرد. اجباری کردنش یعنی موتور باید نام افراد را بداند — که نه می‌داند و
 * نه باید بداند.
 *
 * `kpi_alignment` در ۱٫۰ اختیاری است چون Business Brain هنوز ساخته نشده و
 * هدفی برای اتصال وجود ندارد. این یک بدهی ثبت‌شده است، نه فراموشی.
 */
export interface Recommendation {
  readonly recommendation_id: RecommendationId;
  readonly business_id: OrganizationId;
  readonly source: RecommendationSource;
  readonly created_at: ISOTimestamp;

  readonly evidence: readonly RecommendationEvidence[];
  readonly reason: string;
  readonly recommendation: string;

  readonly target_role: TargetRole;
  /** اجباری فقط وقتی `target_role === 'custom_role'`. */
  readonly custom_role_label?: string;
  readonly owner?: ActorId;

  readonly impact: DeclaredImpact;
  readonly effort: Effort;
  readonly priority: number;
  readonly kpi_alignment?: string;

  readonly status: RecommendationStatus;
  readonly permissions: RecommendationPermissions;
  readonly visibility: RecommendationVisibility;

  readonly expires_at: ISOTimestamp | null;
  readonly freshness: Freshness;
}
