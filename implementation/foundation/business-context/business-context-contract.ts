/**
 * MLINO Business Context — قراردادهای دامنه‌ی فاز ۱
 *
 * سند مرجع معماری: mlino_book/contracts/BUSINESS_CONTEXT_MODEL.md
 * مرجع حاکمیت و سیاست:  mlino_book/policy/R8b_BUSINESS_BRAIN_KNOWLEDGE_MODEL.md
 *
 * فاز ۱ مصوب: `Fact` · `Goal` · `KPI` · `Capability`.
 * فاز ۲ (`Observation`، `Signal`، `Decision`) و فاز ۳ (تکامل دانش، یادگیری،
 * استنتاج) عمداً اینجا نیستند.
 *
 * دامنه‌ی این فایل باریک است — فقط **مدل دامنه**:
 *   - بدون شِمای دیتابیس، بدون migration، بدون Repository
 *   - بدون مصرف‌کننده
 *   - `shared-contracts/types.ts` و `prisma/schema.prisma` دست‌نخورده
 *
 * چرا زیر `foundation/`: `tsconfig.json` از قبل `foundation/**` را شامل
 * می‌شود، پس هیچ تغییر پیکربندی لازم نیست.
 */

import { ActorId, ISOTimestamp, OrganizationId } from '../../shared-contracts/types';

export type KnowledgeItemId = string;
export type KnowledgeSourceId = string;
export type FactId = string;
export type GoalId = string;
export type KpiId = string;
export type CapabilityId = string;

// ─────────────────────── نوع در برابر منبع ───────────────────────

/**
 * یازده نوع دانش — تصمیم مصوب مالک محصول.
 *
 * ⚠️ چهار مورد آخر از قبل موجودیت مستقل‌اند (قرارداد پیشنهاد v1.0 و
 * ADR-0005) و در `foundation/recommendation/` پیاده شده‌اند. این طبقه‌بندی
 * به آن‌ها **ارجاع** می‌دهد و دوباره ذخیره‌شان نمی‌کند — وگرنه همان ادغامی
 * می‌شود که ADR-0005 صریحاً ممنوع کرد.
 */
export const KNOWLEDGE_TYPES = [
  'fact',
  'observation',
  'goal',
  'decision',
  'kpi',
  'signal',
  'capability',
  'recommendation',
  'action',
  'outcome',
  'evaluation',
] as const;
export type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number];

/** انواعی که فاز ۱ واقعاً پیاده می‌کند. */
export const PHASE_1_TYPES = ['fact', 'goal', 'kpi', 'capability'] as const;
export type Phase1Type = (typeof PHASE_1_TYPES)[number];

/**
 * پنج منبع دانش — تصمیم مصوب.
 *
 * منبع یک **بُعد** است، نه یک نوع. «مشتری‌ها عصرها می‌آیند» چه انسان بگوید
 * چه سیستم استنتاج کند، محتوایش یکی است؛ آنچه فرق می‌کند این است که از
 * کجا آمده و چقدر می‌شود به آن اتکا کرد.
 */
export const KNOWLEDGE_SOURCES = [
  'HUMAN',
  'CUSTOMER_DATA',
  'SYSTEM',
  'AI_INFERRED',
  'INTEGRATION',
] as const;
export type KnowledgeSourceKind = (typeof KNOWLEDGE_SOURCES)[number];

/**
 * منابعی که امروز واقعاً مجازند.
 *
 * `CUSTOMER_DATA` در فهرست مصوب هست ولی سیاست رضایت R8-a هنوز تصویب نشده
 * و وضعیتش `IMPLEMENTATION_BLOCKED` است. مقدار در سطح نوع تعریف شده — چون
 * مالک صریحاً فهرست را تعیین کرد — ولی `validate` آن را در زمان اجرا رد
 * می‌کند. یعنی هیچ داده‌ی مشتری بدون سیاست وارد نمی‌شود.
 *
 * تنش با درس CR-02 («مقدار غیرقابل‌استفاده در سطح نوع تعریف نشود») ثبت شده
 * است → OD-18.
 */
export const SOURCES_ALLOWED_TODAY: readonly KnowledgeSourceKind[] = [
  'HUMAN',
  'SYSTEM',
  'AI_INFERRED',
  'INTEGRATION',
];

export const VERIFICATION_STATES = ['unverified', 'human_confirmed', 'system_verified'] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

// ─────────────────────── منشأ و تازگی ───────────────────────

export interface Provenance {
  readonly source: KnowledgeSourceKind;
  /** ارجاع به رکورد منبع واقعی — هرگز متن آزاد توصیفی. */
  readonly sourceId: KnowledgeSourceId;
  /** اگر انسانی است، چه کسی. */
  readonly actorId?: ActorId;
  /** اگر محاسبه‌شده یا استنتاجی است، با چه روشی. */
  readonly method?: string;
  readonly assertedAt: ISOTimestamp;
}

export interface Freshness {
  /** `null` = بدون انقضا. */
  readonly validUntil: ISOTimestamp | null;
  readonly lastVerifiedAt: ISOTimestamp | null;
  /** کدام آیتم جایگزینش شد — جایگزینی، نه بازنویسی. */
  readonly supersededBy: KnowledgeItemId | null;
}

/** میدان مشترک هر آیتم زمینه. */
export interface KnowledgeItemBase {
  readonly businessId: OrganizationId;
  readonly type: KnowledgeType;
  readonly provenance: Provenance;
  readonly freshness: Freshness;
  readonly verification: VerificationState;
  /**
   * چه کسی تایید کرد — **اجباری وقتی `verification === 'human_confirmed'`**.
   *
   * ادعای «انسان تایید کرد» بدون نام آن انسان، قابل‌ممیزی نیست و عملاً یعنی
   * سیستم می‌تواند خودش را تایید کند.
   */
  readonly confirmedBy?: ActorId;
  /** اجباری فقط وقتی منبع `AI_INFERRED` است. */
  readonly confidence?: number;
  readonly createdAt: ISOTimestamp;
}

// ─────────────────────── فاز ۱: چهار موجودیت ───────────────────────

/** «چه چیزی درست است» — واقعیت پایدار و قابل‌راستی‌آزمایی. */
export interface BusinessFact extends KnowledgeItemBase {
  readonly type: 'fact';
  readonly factId: FactId;
  readonly statement: string;
  /** دسته‌ی آزاد کسب‌وکار، مثلاً 'capacity' یا 'hours'. */
  readonly subject: string;
}

export const GOAL_STATUSES = ['active', 'achieved', 'abandoned'] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

/** «چه می‌خواهیم» — نتیجه‌ای با افق زمانی. */
export interface Goal extends KnowledgeItemBase {
  readonly type: 'goal';
  readonly goalId: GoalId;
  readonly statement: string;
  readonly horizonStart: ISOTimestamp;
  readonly horizonEnd: ISOTimestamp;
  readonly status: GoalStatus;
  /**
   * KPIهایی که این هدف با آن‌ها سنجیده می‌شود.
   *
   * **حداقل یکی اجباری است.** هدف بدون KPI قابل‌سنجش نیست و نباید مبنای
   * `kpi_alignment` در قرارداد پیشنهاد قرار بگیرد — وگرنه سیستم می‌گوید
   * «این کار به آن هدف کمک می‌کند» بدون اینکه بتواند اثباتش کند.
   */
  readonly measuredBy: readonly KpiId[];
}

export const KPI_DIRECTIONS = ['higher_is_better', 'lower_is_better'] as const;
export type KpiDirection = (typeof KPI_DIRECTIONS)[number];

/**
 * شاخصی که سازمان **انتخاب کرده** بسنجد.
 *
 * KPI ≠ Signal: این یک انتخاب سازمانی است («تصمیم گرفته‌ایم این مهم است»)،
 * نه یک مشاهده. یک عدد می‌تواند Signal باشد بدون اینکه هرگز KPI شود.
 */
export interface Kpi extends KnowledgeItemBase {
  readonly type: 'kpi';
  readonly kpiId: KpiId;
  readonly name: string;
  readonly definition: string;
  readonly unit: string;
  readonly direction: KpiDirection;
  /**
   * روش محاسبه — **اجباری**.
   *
   * بدون آن، دو نفر دو عدد متفاوت می‌گیرند و هر دو فکر می‌کنند درست است.
   */
  readonly calculationMethod: string;
  readonly targetValue?: number;
}

export const CAPABILITY_STATUSES = ['available', 'planned', 'not_available'] as const;
export type CapabilityStatus = (typeof CAPABILITY_STATUSES)[number];

/**
 * کاری که این کسب‌وکار می‌تواند انجام دهد.
 *
 * **مهم‌ترین محافظ ضد پیشنهاد بی‌ربط:** بدون آن، موتور می‌تواند «کمپین
 * ویدیویی راه بیندازید» را به کسب‌وکاری بدهد که هیچ ابزار ویدیویی ندارد.
 * پیشنهادی که کسب‌وکار نمی‌تواند اجرایش کند، نویز است.
 *
 * **V1 فقط توانمندی اعلام‌شده را می‌پذیرد.** استنتاج خودکار توانمندی ممنوع
 * است — «انجام داده» با «می‌تواند انجام دهد» یکی نیست. آینده‌ی ممکن:
 * اعلام‌شده + مشاهده‌شده، ولی نه در این فاز.
 */
export interface Capability extends KnowledgeItemBase {
  readonly type: 'capability';
  readonly capabilityId: CapabilityId;
  readonly name: string;
  readonly status: CapabilityStatus;
  /** نقش‌هایی که این توانمندی را حمل می‌کنند — از یازده نقش قرارداد پیشنهاد. */
  readonly ownedByRoles: readonly string[];
}

export type Phase1ContextItem = BusinessFact | Goal | Kpi | Capability;
