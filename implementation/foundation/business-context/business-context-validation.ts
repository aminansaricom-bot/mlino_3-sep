/**
 * راستی‌آزمایی زمان‌اجرای قراردادهای زمینه‌ی کسب‌وکار — fail-closed.
 *
 * قواعدی که فقط با نوع بیان نمی‌شوند و اینجا اجبار می‌شوند:
 *   ۱. هیچ آیتمی بدون `provenance` معتبر
 *   ۲. `AI_INFERRED` همیشه `confidence` دارد و هرگز `human_confirmed` نیست
 *   ۳. `CUSTOMER_DATA` تا تصویب R8-a رد می‌شود
 *   ۴. هدف بدون KPI پذیرفته نمی‌شود
 *   ۵. KPI بدون روش محاسبه پذیرفته نمی‌شود
 *   ۶. توانمندی فقط اعلام‌شده — `AI_INFERRED` رد می‌شود
 *
 * قاعده‌ی رفتاری: هرچه شناخته‌شده نیست، نامعتبر است. هیچ مقدار پیش‌فرضی جای
 * مقدار غایب نمی‌نشیند — یک پیش‌فرض ساختگی همان «حدس زدن» است.
 */

import {
  CAPABILITY_STATUSES,
  Capability,
  CapabilityStatus,
  GOAL_STATUSES,
  Goal,
  GoalStatus,
  KNOWLEDGE_SOURCES,
  KNOWLEDGE_TYPES,
  KPI_DIRECTIONS,
  KnowledgeSourceKind,
  KnowledgeType,
  Kpi,
  KpiDirection,
  Phase1ContextItem,
  SOURCES_ALLOWED_TODAY,
  VERIFICATION_STATES,
  VerificationState,
} from './business-context-contract';

export interface ValidationFailure {
  readonly field: string;
  readonly problem: string;
}

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly failures: readonly ValidationFailure[] };

export function isKnowledgeType(v: unknown): v is KnowledgeType {
  return typeof v === 'string' && (KNOWLEDGE_TYPES as readonly string[]).includes(v);
}
export function isKnowledgeSource(v: unknown): v is KnowledgeSourceKind {
  return typeof v === 'string' && (KNOWLEDGE_SOURCES as readonly string[]).includes(v);
}
export function isVerificationState(v: unknown): v is VerificationState {
  return typeof v === 'string' && (VERIFICATION_STATES as readonly string[]).includes(v);
}
export function isGoalStatus(v: unknown): v is GoalStatus {
  return typeof v === 'string' && (GOAL_STATUSES as readonly string[]).includes(v);
}
export function isKpiDirection(v: unknown): v is KpiDirection {
  return typeof v === 'string' && (KPI_DIRECTIONS as readonly string[]).includes(v);
}
export function isCapabilityStatus(v: unknown): v is CapabilityStatus {
  return typeof v === 'string' && (CAPABILITY_STATUSES as readonly string[]).includes(v);
}

/** منبعی که امروز واقعاً مجاز است — `CUSTOMER_DATA` مسدود تا R8-a. */
export function isSourceAllowedToday(v: unknown): boolean {
  return isKnowledgeSource(v) && SOURCES_ALLOWED_TODAY.includes(v);
}

export function isParsableTimestamp(v: unknown): boolean {
  return typeof v === 'string' && v.length > 0 && !Number.isNaN(Date.parse(v));
}

function nonEmpty(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * ارتقای استنتاج به واقعیت — تصمیم مصوب: **هرگز خودکار**.
 *
 * تابع عمداً یک *پرسش* است و نه یک عمل: چیزی را ارتقا نمی‌دهد، فقط می‌گوید
 * آیا ارتقا مجاز است. عمل ارتقا نیازمند اعتبارسنجی صریح انسانی است و
 * جایش اینجا نیست.
 */
export function mayPromoteToFact(item: {
  provenance?: { source?: KnowledgeSourceKind };
  verification?: VerificationState;
}): boolean {
  // عمداً دفاعی: این تابع از داخل مسیر راستی‌آزمایی صدا زده می‌شود و هرگز
  // نباید استثنا پرتاب کند. ورودی ناقص یعنی «مجاز نیست»، نه یک خطای زمان‌اجرا.
  const source = item.provenance?.source;
  if (source === undefined) return false;
  if (source !== 'AI_INFERRED') return true;
  return item.verification === 'human_confirmed';
}

/** میدان مشترک — منشأ، تازگی، تایید، اطمینان. */
function validateBase(item: Record<string, unknown>, fail: (f: string, p: string) => void): void {
  if (!nonEmpty(item.businessId)) fail('businessId', 'missing or empty');
  if (!isKnowledgeType(item.type)) fail('type', 'unknown knowledge type');
  if (!isParsableTimestamp(item.createdAt)) fail('createdAt', 'missing or unparsable');

  const prov = item.provenance;
  if (prov === undefined || typeof prov !== 'object' || prov === null) {
    fail('provenance', 'missing — nothing enters without a known origin');
  } else {
    const p = prov as Record<string, unknown>;
    if (!isKnowledgeSource(p.source)) {
      fail('provenance.source', 'unknown source');
    } else if (!isSourceAllowedToday(p.source)) {
      // CUSTOMER_DATA در فهرست مصوب هست ولی R8-a تصویب نشده
      fail('provenance.source', 'CUSTOMER_DATA is blocked until the R8-a consent policy is approved');
    }
    if (!nonEmpty(p.sourceId)) fail('provenance.sourceId', 'missing — must reference a real source');
    if (!isParsableTimestamp(p.assertedAt)) fail('provenance.assertedAt', 'missing or unparsable');
    if (p.source === 'HUMAN' && !nonEmpty(p.actorId)) {
      fail('provenance.actorId', 'required when the source is HUMAN');
    }
    if ((p.source === 'SYSTEM' || p.source === 'AI_INFERRED') && !nonEmpty(p.method)) {
      fail('provenance.method', 'required when the source is SYSTEM or AI_INFERRED');
    }
  }

  if (!isVerificationState(item.verification)) fail('verification', 'unknown verification state');

  const source = (item.provenance as { source?: unknown } | undefined)?.source;
  if (source === 'AI_INFERRED') {
    const c = item.confidence;
    if (typeof c !== 'number' || !Number.isFinite(c) || c < 0 || c > 1) {
      fail('confidence', 'required for AI_INFERRED and must be between 0 and 1');
    }
  }

  // ادعای «انسان تایید کرد» بدون نام آن انسان قابل‌ممیزی نیست — و عملاً یعنی
  // سیستم می‌تواند خودش را تایید کند. این قاعده برای همه‌ی منابع برقرار است،
  // نه فقط استنتاجی.
  if (item.verification === 'human_confirmed' && !nonEmpty(item.confirmedBy)) {
    fail('confirmedBy', 'required when verification is human_confirmed');
  }

  const fr = item.freshness;
  if (fr === undefined || typeof fr !== 'object' || fr === null) {
    fail('freshness', 'missing');
  } else {
    const f = fr as Record<string, unknown>;
    if (f.validUntil !== null && !isParsableTimestamp(f.validUntil)) {
      fail('freshness.validUntil', 'must be null or a parsable timestamp');
    }
    if (f.lastVerifiedAt !== null && !isParsableTimestamp(f.lastVerifiedAt)) {
      fail('freshness.lastVerifiedAt', 'must be null or a parsable timestamp');
    }
    if (f.supersededBy !== null && !nonEmpty(f.supersededBy)) {
      fail('freshness.supersededBy', 'must be null or a real item id');
    }
  }
}

export function validateContextItem(candidate: unknown): ValidationResult {
  const failures: ValidationFailure[] = [];
  const fail = (field: string, problem: string): void => {
    failures.push({ field, problem });
  };

  if (typeof candidate !== 'object' || candidate === null) {
    return { valid: false, failures: [{ field: '(root)', problem: 'not an object' }] };
  }
  const item = candidate as Record<string, unknown>;
  validateBase(item, fail);

  switch (item.type) {
    case 'fact': {
      const f = item as unknown as Partial<import('./business-context-contract').BusinessFact>;
      if (!nonEmpty(f.factId)) fail('factId', 'missing or empty');
      if (!nonEmpty(f.statement)) fail('statement', 'missing or empty');
      if (!nonEmpty(f.subject)) fail('subject', 'missing or empty');
      // قاعده‌ی سخت: استنتاج هرگز مستقیم Fact نمی‌شود
      if (!mayPromoteToFact(item as never)) {
        fail('type', 'an AI_INFERRED item cannot be stored as a fact without human confirmation');
      }
      break;
    }
    case 'goal': {
      const g = item as unknown as Partial<Goal>;
      if (!nonEmpty(g.goalId)) fail('goalId', 'missing or empty');
      if (!nonEmpty(g.statement)) fail('statement', 'missing or empty');
      if (!isParsableTimestamp(g.horizonStart)) fail('horizonStart', 'missing or unparsable');
      if (!isParsableTimestamp(g.horizonEnd)) fail('horizonEnd', 'missing or unparsable');
      if (
        isParsableTimestamp(g.horizonStart) &&
        isParsableTimestamp(g.horizonEnd) &&
        Date.parse(g.horizonEnd as string) <= Date.parse(g.horizonStart as string)
      ) {
        fail('horizonEnd', 'must be after horizonStart');
      }
      if (!isGoalStatus(g.status)) fail('status', 'unknown goal status');
      // بدون KPI، هدف قابل‌سنجش نیست
      if (!Array.isArray(g.measuredBy) || g.measuredBy.length === 0) {
        fail('measuredBy', 'a goal needs at least one KPI, otherwise it is not measurable');
      } else if (!g.measuredBy.every(nonEmpty)) {
        fail('measuredBy', 'contains an empty KPI id');
      }
      break;
    }
    case 'kpi': {
      const k = item as unknown as Partial<Kpi>;
      if (!nonEmpty(k.kpiId)) fail('kpiId', 'missing or empty');
      if (!nonEmpty(k.name)) fail('name', 'missing or empty');
      if (!nonEmpty(k.definition)) fail('definition', 'missing or empty');
      if (!nonEmpty(k.unit)) fail('unit', 'missing or empty');
      if (!isKpiDirection(k.direction)) fail('direction', 'unknown direction');
      // بدون روش محاسبه، دو نفر دو عدد متفاوت می‌گیرند
      if (!nonEmpty(k.calculationMethod)) {
        fail('calculationMethod', 'required — without it two people compute two different numbers');
      }
      if (k.targetValue !== undefined && !Number.isFinite(k.targetValue)) {
        fail('targetValue', 'must be a finite number when present');
      }
      break;
    }
    case 'capability': {
      const c = item as unknown as Partial<Capability>;
      if (!nonEmpty(c.capabilityId)) fail('capabilityId', 'missing or empty');
      if (!nonEmpty(c.name)) fail('name', 'missing or empty');
      if (!isCapabilityStatus(c.status)) fail('status', 'unknown capability status');
      if (!Array.isArray(c.ownedByRoles)) {
        fail('ownedByRoles', 'missing');
      } else if (!c.ownedByRoles.every(nonEmpty)) {
        fail('ownedByRoles', 'contains an empty role');
      }
      // V1 فقط توانمندی اعلام‌شده — «انجام داده» با «می‌تواند انجام دهد» یکی نیست
      if ((item.provenance as { source?: unknown } | undefined)?.source === 'AI_INFERRED') {
        fail('provenance.source', 'V1 accepts declared capability only; inferring capability is not allowed');
      }
      break;
    }
    default:
      if (isKnowledgeType(item.type)) {
        fail('type', `type '${String(item.type)}' is not part of phase 1`);
      }
  }

  return failures.length === 0 ? { valid: true } : { valid: false, failures };
}

/** کمک‌کننده‌ی خوانا برای مصرف‌کننده‌های بعدی. */
export function isPhase1ContextItem(candidate: unknown): candidate is Phase1ContextItem {
  return validateContextItem(candidate).valid;
}
