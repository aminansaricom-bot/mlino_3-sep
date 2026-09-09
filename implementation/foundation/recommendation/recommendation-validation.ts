/**
 * راستی‌آزمایی زمان‌اجرای قرارداد پیشنهاد — fail-closed.
 *
 * چرا نوع‌های TypeScript کافی نیستند: قرارداد سه قاعده‌ی سخت دارد که هیچ‌کدام
 * را نمی‌شود فقط با نوع بیان کرد —
 *   ۱. هر پیشنهاد حداقل یک شواهد واقعی دارد
 *   ۲. `impact.evidence_ref` باید به یکی از همان شواهدها اشاره کند
 *   ۳. `custom_role` بدون برچسب، دوباره «بدون مسئول» است
 *
 * و مهم‌تر: Adapterها داده را از دو موتور بیرونی می‌آورند که هیچ‌کدام امروز
 * این مفاهیم را ندارند. آنجا مقدار در زمان اجرا می‌رسد، نه در زمان کامپایل.
 *
 * قاعده‌ی رفتاری: **fail-closed**. هرچه شناخته‌شده نیست، نامعتبر است. هیچ
 * مقدار پیش‌فرضی جای مقدار غایب گذاشته نمی‌شود — چون یک پیش‌فرض ساختگی دقیقاً
 * همان «حدس زدن» است که در کل پروژه ممنوع است.
 */

import {
  EFFORT_SCALE,
  Effort,
  EVIDENCE_KINDS,
  EvidenceKind,
  IMPACT_LEVELS,
  IMPACT_TYPES,
  ImpactLevel,
  ImpactType,
  RECOMMENDATION_STATUSES,
  Recommendation,
  RecommendationStatus,
  TARGET_ROLES,
  TargetRole,
} from './recommendation-contract';

export interface ValidationFailure {
  readonly field: string;
  readonly problem: string;
}

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly failures: readonly ValidationFailure[] };

export function isTargetRole(value: unknown): value is TargetRole {
  return typeof value === 'string' && (TARGET_ROLES as readonly string[]).includes(value);
}

export function isImpactType(value: unknown): value is ImpactType {
  return typeof value === 'string' && (IMPACT_TYPES as readonly string[]).includes(value);
}

export function isImpactLevel(value: unknown): value is ImpactLevel {
  return typeof value === 'number' && (IMPACT_LEVELS as readonly number[]).includes(value);
}

export function isEffort(value: unknown): value is Effort {
  return typeof value === 'string' && (EFFORT_SCALE as readonly string[]).includes(value);
}

export function isEvidenceKind(value: unknown): value is EvidenceKind {
  return typeof value === 'string' && (EVIDENCE_KINDS as readonly string[]).includes(value);
}

export function isRecommendationStatus(value: unknown): value is RecommendationStatus {
  return (
    typeof value === 'string' && (RECOMMENDATION_STATUSES as readonly string[]).includes(value)
  );
}

/** `ISOTimestamp` در قرارداد منجمد فقط `string` است؛ اینجا واقعاً تجزیه می‌شود. */
export function isParsableTimestamp(value: unknown): boolean {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * راستی‌آزمایی کامل یک پیشنهاد.
 *
 * ورودی عمداً `unknown` است، نه `Recommendation` — چون کل هدف این تابع
 * بررسی داده‌ای است که هنوز اثبات نشده به قرارداد می‌خورد.
 */
export function validateRecommendation(candidate: unknown): ValidationResult {
  const failures: ValidationFailure[] = [];
  const fail = (field: string, problem: string): void => {
    failures.push({ field, problem });
  };

  if (typeof candidate !== 'object' || candidate === null) {
    return { valid: false, failures: [{ field: '(root)', problem: 'not an object' }] };
  }
  const r = candidate as Partial<Recommendation>;

  if (!nonEmptyString(r.recommendation_id)) fail('recommendation_id', 'missing or empty');
  if (!nonEmptyString(r.business_id)) fail('business_id', 'missing or empty');
  if (!nonEmptyString(r.reason)) fail('reason', 'missing or empty');
  if (!nonEmptyString(r.recommendation)) fail('recommendation', 'missing or empty');
  if (!isParsableTimestamp(r.created_at)) fail('created_at', 'missing or unparsable');

  if (r.source === undefined || typeof r.source !== 'object' || r.source === null) {
    fail('source', 'missing');
  } else {
    if (!nonEmptyString(r.source.system)) fail('source.system', 'missing or empty');
    if (!nonEmptyString(r.source.engine)) fail('source.engine', 'missing or empty');
    if (!nonEmptyString(r.source.version)) fail('source.version', 'missing or empty');
  }

  // ── قاعده‌ی سخت ۱: هیچ پیشنهادی بدون شواهد ──
  const evidenceIds = new Set<string>();
  if (!Array.isArray(r.evidence) || r.evidence.length === 0) {
    fail('evidence', 'at least one evidence item is required');
  } else {
    r.evidence.forEach((e, i) => {
      if (e === null || typeof e !== 'object') {
        fail(`evidence[${i}]`, 'not an object');
        return;
      }
      if (!nonEmptyString(e.evidence_id)) fail(`evidence[${i}].evidence_id`, 'missing or empty');
      else if (evidenceIds.has(e.evidence_id))
        fail(`evidence[${i}].evidence_id`, 'duplicate evidence_id');
      else evidenceIds.add(e.evidence_id);

      if (!isEvidenceKind(e.kind)) fail(`evidence[${i}].kind`, 'unknown evidence kind');
      if (!nonEmptyString(e.summary)) fail(`evidence[${i}].summary`, 'missing or empty');
      // `reference` باید به رکورد واقعی منبع اشاره کند — خلاصه‌ی انسانی جایگزینش نیست
      if (!nonEmptyString(e.reference)) fail(`evidence[${i}].reference`, 'missing or empty');
      if (!isParsableTimestamp(e.observed_at))
        fail(`evidence[${i}].observed_at`, 'missing or unparsable');
    });
  }

  // ── قاعده‌ی سخت ۲: هیچ پیشنهادی بدون نقش مسئول ──
  if (!isTargetRole(r.target_role)) {
    fail('target_role', 'missing or not one of the eleven approved roles');
  } else if (r.target_role === 'custom_role' && !nonEmptyString(r.custom_role_label)) {
    // بدون برچسب، `custom_role` عملاً یعنی «بدون مسئول»
    fail('custom_role_label', 'required when target_role is custom_role');
  }

  // `owner` اختیاری است و اختیاری می‌ماند — ولی اگر آمد، باید معنادار باشد
  if (r.owner !== undefined && !nonEmptyString(r.owner)) {
    fail('owner', 'present but empty — omit it instead');
  }

  // ── قاعده‌ی سخت ۳: هر ادعای اثر باید شواهد داشته باشد ──
  if (r.impact === undefined || typeof r.impact !== 'object' || r.impact === null) {
    fail('impact', 'missing');
  } else {
    if (!isImpactType(r.impact.impact_type)) fail('impact.impact_type', 'unknown impact type');
    if (!isImpactLevel(r.impact.impact_level))
      fail('impact.impact_level', 'must be 1, 2, 3 or 4');
    if (!nonEmptyString(r.impact.evidence_ref)) {
      fail('impact.evidence_ref', 'every declared impact must reference evidence');
    } else if (!evidenceIds.has(r.impact.evidence_ref)) {
      fail('impact.evidence_ref', 'does not match any evidence_id on this recommendation');
    }
  }

  if (!isEffort(r.effort)) fail('effort', 'must be XS, S, M, L or XL');
  if (typeof r.priority !== 'number' || !Number.isFinite(r.priority)) {
    fail('priority', 'must be a finite number');
  }
  if (!isRecommendationStatus(r.status)) fail('status', 'unknown status');

  // ── دیده‌شدن و اختیار: دو چیز جدا، هر دو لازم ──
  if (
    r.visibility === undefined ||
    typeof r.visibility !== 'object' ||
    r.visibility === null ||
    !Array.isArray(r.visibility.roles)
  ) {
    fail('visibility', 'missing');
  } else if (!r.visibility.roles.every(isTargetRole)) {
    fail('visibility.roles', 'contains an unknown role');
  }

  if (
    r.permissions === undefined ||
    typeof r.permissions !== 'object' ||
    r.permissions === null ||
    !Array.isArray(r.permissions.can_change_status)
  ) {
    fail('permissions', 'missing');
  } else if (!r.permissions.can_change_status.every(isTargetRole)) {
    fail('permissions.can_change_status', 'contains an unknown role');
  }

  // `null` یعنی «بدون انقضا» و مجاز است؛ ولی رشته‌ی نامعتبر مجاز نیست
  if (r.expires_at !== null && !isParsableTimestamp(r.expires_at)) {
    fail('expires_at', 'must be null or a parsable timestamp');
  }

  if (r.freshness === undefined || typeof r.freshness !== 'object' || r.freshness === null) {
    fail('freshness', 'missing');
  } else if (
    r.freshness.evidence_valid_until !== null &&
    !isParsableTimestamp(r.freshness.evidence_valid_until)
  ) {
    fail('freshness.evidence_valid_until', 'must be null or a parsable timestamp');
  }

  return failures.length === 0 ? { valid: true } : { valid: false, failures };
}
