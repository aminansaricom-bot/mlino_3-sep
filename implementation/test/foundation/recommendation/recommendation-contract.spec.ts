import {
  EFFORT_MEANING,
  EFFORT_SCALE,
  IMPACT_LEVELS,
  IMPACT_TYPES,
  Recommendation,
  TARGET_ROLES,
} from '../../../foundation/recommendation/recommendation-contract';
import {
  isEffort,
  isImpactLevel,
  isImpactType,
  isTargetRole,
  validateRecommendation,
} from '../../../foundation/recommendation/recommendation-validation';

/**
 * قرارداد مشترک پیشنهاد — نسخه‌ی ۱٫۰.
 *
 * این تست‌ها فقط **تعریف دامنه** را می‌سنجند. هیچ ذخیره‌سازی، دیتابیس یا
 * مصرف‌کننده‌ای در این مرحله وجود ندارد و عمداً ساخته نشده — تصمیم مالک:
 * قرارداد پیش از دیتابیس.
 */

const VALID: Recommendation = {
  recommendation_id: 'rec_1',
  business_id: 'org_1',
  source: { system: 'v1_value_engines', engine: 'cancellation', version: '1.0.0' },
  created_at: '2026-09-09T10:00:00.000Z',
  evidence: [
    {
      evidence_id: 'ev_1',
      kind: 'metric',
      summary: 'نرخ لغو نوبت سه هفته پیاپی بالای ۱۵٪ بوده',
      reference: 'opportunity_current_state:corr_42',
      observed_at: '2026-09-08T09:00:00.000Z',
    },
  ],
  reason: 'لغو نوبت پیاپی بالا رفته و ظرفیت عصر خالی مانده',
  recommendation: 'یادآوری پیامکی ۲۴ ساعت پیش از نوبت فعال شود',
  target_role: 'operations_manager',
  impact: { impact_type: 'retention', impact_level: 3, evidence_ref: 'ev_1' },
  effort: 'S',
  priority: 10,
  status: 'proposed',
  permissions: { can_change_status: ['operations_manager', 'general_manager'] },
  visibility: { roles: ['owner_founder', 'general_manager', 'operations_manager'] },
  expires_at: null,
  freshness: { evidence_valid_until: null },
};

/** کپی با یک تغییر — تا هیچ تستی نمونه‌ی مشترک را جهش ندهد. */
function withChange(patch: Record<string, unknown>): unknown {
  return { ...VALID, ...patch };
}

describe('قرارداد پیشنهاد v1.0 — مقادیر مجاز نقش', () => {
  it('هر یازده نقش مصوب مالک محصول پذیرفته می‌شوند', () => {
    expect([...TARGET_ROLES]).toEqual([
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
    ]);
    for (const role of TARGET_ROLES) expect(isTargetRole(role)).toBe(true);
  });

  it('نقش ناشناخته رد می‌شود — fail-closed، نه نگاشت به یک پیش‌فرض', () => {
    expect(isTargetRole('ceo')).toBe(false);
    expect(isTargetRole('')).toBe(false);
    expect(isTargetRole(undefined)).toBe(false);

    const result = validateRecommendation(withChange({ target_role: 'ceo' }));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.failures.some((f) => f.field === 'target_role')).toBe(true);
    }
  });

  it('`target_role` اجباری است — پیشنهاد بدون نقش مسئول معتبر نیست', () => {
    const { target_role, ...withoutRole } = VALID;
    void target_role;
    const result = validateRecommendation(withoutRole);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.failures.some((f) => f.field === 'target_role')).toBe(true);
    }
  });
});

describe('قرارداد پیشنهاد v1.0 — نقش سفارشی', () => {
  it('`custom_role` بدون برچسب رد می‌شود؛ چون عملاً یعنی «بدون مسئول»', () => {
    const result = validateRecommendation(withChange({ target_role: 'custom_role' }));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.failures.some((f) => f.field === 'custom_role_label')).toBe(true);
    }
  });

  it('`custom_role` با برچسب معنادار پذیرفته می‌شود', () => {
    const result = validateRecommendation(
      withChange({ target_role: 'custom_role', custom_role_label: 'مسئول فنی کلینیک' }),
    );
    expect(result.valid).toBe(true);
  });

  it('برچسب فقط برای نقش سفارشی لازم است، نه برای ده نقش استاندارد', () => {
    expect(validateRecommendation(withChange({ target_role: 'marketing' })).valid).toBe(true);
  });
});

describe('قرارداد پیشنهاد v1.0 — اختیاری بودن owner', () => {
  it('نبودِ `owner` کاملاً معتبر است — پیشنهاد به شخص وابسته نیست', () => {
    expect(VALID.owner).toBeUndefined();
    expect(validateRecommendation(VALID).valid).toBe(true);
  });

  it('`owner` می‌تواند بیاید و پیشنهاد همچنان معتبر است', () => {
    expect(validateRecommendation(withChange({ owner: 'actor_7' })).valid).toBe(true);
  });

  it('`owner` خالی رد می‌شود — یا حذفش کن یا مقدار واقعی بده', () => {
    const result = validateRecommendation(withChange({ owner: '   ' }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.failures.some((f) => f.field === 'owner')).toBe(true);
  });
});

describe('قرارداد پیشنهاد v1.0 — نوع و سطح اثر', () => {
  it('هشت نوع اثر مصوب پذیرفته می‌شوند', () => {
    expect([...IMPACT_TYPES]).toEqual([
      'revenue_growth',
      'customer_satisfaction',
      'cost_reduction',
      'efficiency',
      'risk_reduction',
      'brand_growth',
      'retention',
      'quality_improvement',
    ]);
    for (const t of IMPACT_TYPES) expect(isImpactType(t)).toBe(true);
  });

  it('نوع اثر ناشناخته رد می‌شود', () => {
    expect(isImpactType('growth')).toBe(false);
    const result = validateRecommendation(
      withChange({ impact: { ...VALID.impact, impact_type: 'growth' } }),
    );
    expect(result.valid).toBe(false);
  });

  it('سطح اثر فقط ۱ تا ۴ است', () => {
    expect([...IMPACT_LEVELS]).toEqual([1, 2, 3, 4]);
    for (const l of IMPACT_LEVELS) expect(isImpactLevel(l)).toBe(true);
    expect(isImpactLevel(0)).toBe(false);
    expect(isImpactLevel(5)).toBe(false);
    expect(isImpactLevel('3')).toBe(false);
  });

  it('سطح خارج از بازه رد می‌شود', () => {
    const result = validateRecommendation(
      withChange({ impact: { ...VALID.impact, impact_level: 5 } }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.failures.some((f) => f.field === 'impact.impact_level')).toBe(true);
    }
  });
});

describe('قرارداد پیشنهاد v1.0 — قاعده‌ی سخت: هر اثر باید شواهد داشته باشد', () => {
  it('اثر بدون `evidence_ref` رد می‌شود', () => {
    const result = validateRecommendation(
      withChange({ impact: { impact_type: 'efficiency', impact_level: 2 } }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.failures.some((f) => f.field === 'impact.evidence_ref')).toBe(true);
    }
  });

  it('`evidence_ref` که به هیچ شواهدی از همین پیشنهاد اشاره نکند رد می‌شود', () => {
    const result = validateRecommendation(
      withChange({ impact: { ...VALID.impact, evidence_ref: 'ev_does_not_exist' } }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      const f = result.failures.find((x) => x.field === 'impact.evidence_ref');
      expect(f?.problem).toContain('does not match');
    }
  });

  it('پیشنهاد بدون هیچ شواهدی رد می‌شود', () => {
    const result = validateRecommendation(withChange({ evidence: [] }));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.failures.some((f) => f.field === 'evidence')).toBe(true);
    }
  });

  it('شواهد بدون `reference` واقعی رد می‌شود — خلاصه‌ی انسانی جایگزینش نیست', () => {
    const result = validateRecommendation(
      withChange({ evidence: [{ ...VALID.evidence[0], reference: '' }] }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.failures.some((f) => f.field === 'evidence[0].reference')).toBe(true);
    }
  });

  it('`evidence_id` تکراری رد می‌شود تا ارجاع اثر مبهم نشود', () => {
    const result = validateRecommendation(
      withChange({ evidence: [VALID.evidence[0], { ...VALID.evidence[0] }] }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.failures.some((f) => f.problem === 'duplicate evidence_id')).toBe(true);
    }
  });
});

describe('قرارداد پیشنهاد v1.0 — مقیاس effort', () => {
  it('پنج مقدار مصوب، با معنای زمانی', () => {
    expect([...EFFORT_SCALE]).toEqual(['XS', 'S', 'M', 'L', 'XL']);
    expect(EFFORT_MEANING.XS).toBe('کمتر از یک ساعت');
    expect(EFFORT_MEANING.XL).toBe('پروژه‌ی راهبردی');
    for (const e of EFFORT_SCALE) expect(isEffort(e)).toBe(true);
  });

  it('مقدار خارج از مقیاس رد می‌شود', () => {
    expect(isEffort('XXL')).toBe(false);
    expect(isEffort('medium')).toBe(false);
    const result = validateRecommendation(withChange({ effort: 'XXL' }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.failures.some((f) => f.field === 'effort')).toBe(true);
  });
});

describe('قرارداد پیشنهاد v1.0 — تفکیک visibility از permissions', () => {
  it('هر دو لازم‌اند و دو مفهوم جدا هستند', () => {
    const noVisibility = { ...VALID } as Record<string, unknown>;
    delete noVisibility.visibility;
    expect(validateRecommendation(noVisibility).valid).toBe(false);

    const noPermissions = { ...VALID } as Record<string, unknown>;
    delete noPermissions.permissions;
    expect(validateRecommendation(noPermissions).valid).toBe(false);
  });

  it('دیدن با تغییردادن یکی نیست — نقشی که می‌بیند لزوماً اختیار تغییر ندارد', () => {
    const viewOnly = validateRecommendation(
      withChange({
        visibility: { roles: ['owner_founder', 'marketing', 'sales'] },
        permissions: { can_change_status: ['owner_founder'] },
      }),
    );
    expect(viewOnly.valid).toBe(true);
    expect(VALID.visibility.roles).not.toEqual(VALID.permissions.can_change_status);
  });

  it('نقش ناشناخته در هر کدام رد می‌شود', () => {
    expect(validateRecommendation(withChange({ visibility: { roles: ['ceo'] } })).valid).toBe(
      false,
    );
    expect(
      validateRecommendation(withChange({ permissions: { can_change_status: ['ceo'] } })).valid,
    ).toBe(false);
  });
});

describe('قرارداد پیشنهاد v1.0 — تفکیک دامنه‌ی پیشنهاد از اقدام و نتیجه', () => {
  it('پیشنهاد، نتیجه و ارزیابی را داخل خودش حمل نمی‌کند', () => {
    // Outcome و Evaluation موجودیت‌های جدا هستند (ActionRecord/OutcomeRecord/
    // EvaluationRecord) و عمداً داخل Recommendation ادغام نشده‌اند — وگرنه
    // «پیشنهاد دادم» با «انجام شد» و «مؤثر بود» قاطی می‌شود.
    expect(Object.keys(VALID)).not.toContain('outcome');
    expect(Object.keys(VALID)).not.toContain('evaluation');
    expect(Object.keys(VALID)).toContain('status');
  });

  it('`status` فقط چرخه‌ی عمر پیشنهاد را می‌گوید، نه اثربخشی را', () => {
    for (const s of ['proposed', 'accepted', 'in_progress', 'done', 'dismissed', 'expired']) {
      expect(validateRecommendation(withChange({ status: s })).valid).toBe(true);
    }
    expect(validateRecommendation(withChange({ status: 'effective' })).valid).toBe(false);
  });
});

describe('قرارداد پیشنهاد v1.0 — زمان و تازگی', () => {
  it('`expires_at` می‌تواند null باشد (بدون انقضا)', () => {
    expect(validateRecommendation(withChange({ expires_at: null })).valid).toBe(true);
  });

  it('تاریخ نامعتبر رد می‌شود — نه نادیده گرفته می‌شود و نه به now تبدیل', () => {
    expect(validateRecommendation(withChange({ expires_at: 'دیروز' })).valid).toBe(false);
    expect(validateRecommendation(withChange({ created_at: 'not-a-date' })).valid).toBe(false);
    expect(
      validateRecommendation(withChange({ freshness: { evidence_valid_until: 'soon' } })).valid,
    ).toBe(false);
  });

  it('`evidence_valid_until` می‌تواند null باشد', () => {
    expect(
      validateRecommendation(withChange({ freshness: { evidence_valid_until: null } })).valid,
    ).toBe(true);
  });
});

describe('قرارداد پیشنهاد v1.0 — رفتار کلی', () => {
  it('نمونه‌ی کامل و درست معتبر است', () => {
    expect(validateRecommendation(VALID)).toEqual({ valid: true });
  });

  it('ورودی غیرشیء رد می‌شود، نه اینکه استثنا پرتاب کند', () => {
    for (const bad of [null, undefined, 'x', 42, []]) {
      expect(validateRecommendation(bad).valid).toBe(false);
    }
  });

  it('همه‌ی ایرادها یکجا برمی‌گردند، نه فقط اولی', () => {
    const result = validateRecommendation({ recommendation_id: 'rec_x' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.failures.length).toBeGreaterThan(5);
  });
});
