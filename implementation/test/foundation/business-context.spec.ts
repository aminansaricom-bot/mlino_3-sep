import {
  BusinessFact,
  Capability,
  Goal,
  KNOWLEDGE_SOURCES,
  KNOWLEDGE_TYPES,
  Kpi,
  PHASE_1_TYPES,
  SOURCES_ALLOWED_TODAY,
} from '../../foundation/business-context/business-context-contract';
import {
  isSourceAllowedToday,
  mayPromoteToFact,
  validateContextItem,
} from '../../foundation/business-context/business-context-validation';

/**
 * زمینه‌ی کسب‌وکار — فاز ۱ (`Fact` · `Goal` · `KPI` · `Capability`).
 *
 * فقط مدل دامنه. هیچ شِمای دیتابیس، migration یا Repositoryای در این مرحله
 * وجود ندارد و عمداً ساخته نشده — تصمیم مصوب: اول قرارداد دامنه.
 */

const humanProv = {
  source: 'HUMAN' as const,
  sourceId: 'src_onboarding_form',
  actorId: 'actor_owner_1',
  assertedAt: '2026-09-10T08:00:00.000Z',
};
const freshForever = { validUntil: null, lastVerifiedAt: null, supersededBy: null };

const FACT: BusinessFact = {
  businessId: 'org_1',
  type: 'fact',
  factId: 'fact_1',
  statement: 'سه اتاق درمان داریم',
  subject: 'capacity',
  provenance: humanProv,
  freshness: freshForever,
  verification: 'human_confirmed',
  confirmedBy: 'actor_owner_1',
  createdAt: '2026-09-10T08:00:00.000Z',
};

const KPI: Kpi = {
  businessId: 'org_1',
  type: 'kpi',
  kpiId: 'kpi_cancel_rate',
  name: 'نرخ لغو نوبت',
  definition: 'نسبت نوبت‌های لغوشده به کل نوبت‌های رزروشده در یک ماه',
  unit: 'percent',
  direction: 'lower_is_better',
  calculationMethod: 'cancelled_appointments / booked_appointments * 100، ماهانه',
  targetValue: 5,
  provenance: humanProv,
  freshness: freshForever,
  verification: 'human_confirmed',
  confirmedBy: 'actor_owner_1',
  createdAt: '2026-09-10T08:00:00.000Z',
};

const GOAL: Goal = {
  businessId: 'org_1',
  type: 'goal',
  goalId: 'goal_1',
  statement: 'کاهش نرخ لغو نوبت به زیر ۵٪',
  horizonStart: '2026-09-01T00:00:00.000Z',
  horizonEnd: '2026-12-31T00:00:00.000Z',
  status: 'active',
  measuredBy: ['kpi_cancel_rate'],
  provenance: humanProv,
  freshness: freshForever,
  verification: 'human_confirmed',
  confirmedBy: 'actor_owner_1',
  createdAt: '2026-09-10T08:00:00.000Z',
};

const CAPABILITY: Capability = {
  businessId: 'org_1',
  type: 'capability',
  capabilityId: 'cap_1',
  name: 'نوبت‌دهی آنلاین',
  status: 'available',
  ownedByRoles: ['operations_manager'],
  provenance: humanProv,
  freshness: freshForever,
  verification: 'human_confirmed',
  confirmedBy: 'actor_owner_1',
  createdAt: '2026-09-10T08:00:00.000Z',
};

const change = (base: object, patch: Record<string, unknown>): unknown => ({ ...base, ...patch });

describe('زمینه‌ی کسب‌وکار — نوع در برابر منبع', () => {
  it('یازده نوع دانش مصوب تعریف شده‌اند', () => {
    expect([...KNOWLEDGE_TYPES]).toEqual([
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
    ]);
  });

  it('پنج منبع مصوب تعریف شده‌اند — منبع یک بُعد است، نه یک نوع', () => {
    expect([...KNOWLEDGE_SOURCES]).toEqual([
      'HUMAN',
      'CUSTOMER_DATA',
      'SYSTEM',
      'AI_INFERRED',
      'INTEGRATION',
    ]);
    // UserKnowledge و InferredKnowledge نوع نیستند
    expect(KNOWLEDGE_TYPES).not.toContain('user_knowledge');
    expect(KNOWLEDGE_TYPES).not.toContain('inferred_knowledge');
  });

  it('فاز ۱ فقط چهار نوع را پیاده می‌کند', () => {
    expect([...PHASE_1_TYPES]).toEqual(['fact', 'goal', 'kpi', 'capability']);
  });

  it('نوع فاز ۲ و ۳ در این مرحله رد می‌شود، نه اینکه بی‌صدا بپذیرد', () => {
    for (const t of ['observation', 'signal', 'decision']) {
      const r = validateContextItem(change(FACT, { type: t }));
      expect(r.valid).toBe(false);
      if (!r.valid) expect(r.failures.some((f) => f.problem.includes('phase 1'))).toBe(true);
    }
  });
});

describe('زمینه‌ی کسب‌وکار — `CUSTOMER_DATA` مسدود تا R8-a', () => {
  it('در فهرست منابع هست ولی امروز مجاز نیست', () => {
    expect(KNOWLEDGE_SOURCES).toContain('CUSTOMER_DATA');
    expect(SOURCES_ALLOWED_TODAY).not.toContain('CUSTOMER_DATA');
    expect(isSourceAllowedToday('CUSTOMER_DATA')).toBe(false);
  });

  it('هر آیتمی با منبع داده‌ی مشتری رد می‌شود', () => {
    const r = validateContextItem(
      change(FACT, {
        provenance: { ...humanProv, source: 'CUSTOMER_DATA' },
      }),
    );
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.failures.some((f) => f.problem.includes('R8-a'))).toBe(true);
    }
  });

  it('چهار منبع دیگر مجازند', () => {
    for (const s of SOURCES_ALLOWED_TODAY) expect(isSourceAllowedToday(s)).toBe(true);
  });
});

describe('زمینه‌ی کسب‌وکار — منشأ اجباری', () => {
  it('هیچ آیتمی بدون منشأ وارد نمی‌شود', () => {
    const noProv = { ...FACT } as Record<string, unknown>;
    delete noProv.provenance;
    const r = validateContextItem(noProv);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.failures.some((f) => f.field === 'provenance')).toBe(true);
  });

  it('`sourceId` باید به منبع واقعی اشاره کند', () => {
    const r = validateContextItem(
      change(FACT, { provenance: { ...humanProv, sourceId: '' } }),
    );
    expect(r.valid).toBe(false);
  });

  it('منبع انسانی بدون بازیگر رد می‌شود', () => {
    const p = { ...humanProv } as Record<string, unknown>;
    delete p.actorId;
    expect(validateContextItem(change(FACT, { provenance: p })).valid).toBe(false);
  });

  it('منبع سیستمی یا استنتاجی بدون روش رد می‌شود', () => {
    const r = validateContextItem(
      change(KPI, {
        provenance: { source: 'SYSTEM', sourceId: 'src_x', assertedAt: humanProv.assertedAt },
      }),
    );
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.failures.some((f) => f.field === 'provenance.method')).toBe(true);
  });
});

describe('زمینه‌ی کسب‌وکار — استنتاج هرگز خودکار Fact نمی‌شود', () => {
  const inferred = {
    source: 'AI_INFERRED' as const,
    sourceId: 'src_engine_1',
    method: 'تحلیل الگوی نوبت‌ها',
    assertedAt: '2026-09-10T08:00:00.000Z',
  };

  it('`mayPromoteToFact` برای استنتاج تاییدنشده false است', () => {
    expect(
      mayPromoteToFact({ provenance: { source: 'AI_INFERRED' }, verification: 'unverified' }),
    ).toBe(false);
    expect(
      mayPromoteToFact({ provenance: { source: 'AI_INFERRED' }, verification: 'system_verified' }),
    ).toBe(false);
  });

  it('فقط تایید انسانی صریح، ارتقا را مجاز می‌کند', () => {
    expect(
      mayPromoteToFact({ provenance: { source: 'AI_INFERRED' }, verification: 'human_confirmed' }),
    ).toBe(true);
  });

  it('ثبت یک Fact استنتاجی تاییدنشده رد می‌شود', () => {
    const r = validateContextItem(
      change(FACT, { provenance: inferred, verification: 'unverified', confidence: 0.93 }),
    );
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.failures.some((f) => f.problem.includes('human confirmation'))).toBe(true);
    }
  });

  it('اطمینان بالا جای تایید را نمی‌گیرد', () => {
    const r = validateContextItem(
      change(FACT, { provenance: inferred, verification: 'unverified', confidence: 0.99 }),
    );
    expect(r.valid).toBe(false);
  });

  it('`confidence` برای استنتاج اجباری و در بازه‌ی ۰ تا ۱ است', () => {
    expect(validateContextItem(change(KPI, { provenance: inferred, verification: 'unverified' })).valid).toBe(false);
    expect(
      validateContextItem(
        change(KPI, { provenance: inferred, confidence: 1.5, verification: 'unverified' }),
      ).valid,
    ).toBe(false);
    expect(
      validateContextItem(
        change(KPI, { provenance: inferred, confidence: 0.7, verification: 'unverified', confirmedBy: undefined }),
      ).valid,
    ).toBe(true);
  });

  it('منبع غیراستنتاجی نیازی به اطمینان ندارد', () => {
    expect(mayPromoteToFact({ provenance: { source: 'HUMAN' }, verification: 'unverified' })).toBe(
      true,
    );
    expect(validateContextItem(FACT).valid).toBe(true);
  });
});

describe('زمینه‌ی کسب‌وکار — ادعای تایید انسانی باید نام داشته باشد', () => {
  it('`human_confirmed` بدون `confirmedBy` رد می‌شود — وگرنه سیستم خودش را تایید می‌کند', () => {
    const noConfirmer = { ...FACT } as Record<string, unknown>;
    delete noConfirmer.confirmedBy;
    const r = validateContextItem(noConfirmer);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.failures.some((f) => f.field === 'confirmedBy')).toBe(true);
  });

  it('این قاعده برای همه‌ی منابع برقرار است، نه فقط استنتاجی', () => {
    const systemConfirmed = change(KPI, {
      provenance: { source: 'SYSTEM', sourceId: 'src_x', method: 'محاسبه‌ی ماهانه', assertedAt: humanProv.assertedAt },
      confirmedBy: undefined,
    });
    expect(validateContextItem(systemConfirmed).valid).toBe(false);
  });

  it('`unverified` نیازی به تاییدکننده ندارد', () => {
    const unver = change(FACT, { verification: 'unverified', confirmedBy: undefined });
    expect(validateContextItem(unver).valid).toBe(true);
  });
});

describe('زمینه‌ی کسب‌وکار — Goal', () => {
  it('نمونه‌ی درست معتبر است', () => {
    expect(validateContextItem(GOAL)).toEqual({ valid: true });
  });

  it('هدف بدون KPI رد می‌شود — قابل‌سنجش نیست', () => {
    const r = validateContextItem(change(GOAL, { measuredBy: [] }));
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.failures.some((f) => f.problem.includes('not measurable'))).toBe(true);
    }
  });

  it('پایان افق باید پس از شروع باشد', () => {
    const r = validateContextItem(
      change(GOAL, { horizonEnd: '2026-08-01T00:00:00.000Z' }),
    );
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.failures.some((f) => f.field === 'horizonEnd')).toBe(true);
  });

  it('وضعیت ناشناخته رد می‌شود', () => {
    expect(validateContextItem(change(GOAL, { status: 'paused' })).valid).toBe(false);
  });

  it('هر سه وضعیت مصوب پذیرفته می‌شوند', () => {
    for (const st of ['active', 'achieved', 'abandoned']) {
      expect(validateContextItem(change(GOAL, { status: st })).valid).toBe(true);
    }
  });
});

describe('زمینه‌ی کسب‌وکار — KPI', () => {
  it('نمونه‌ی درست معتبر است', () => {
    expect(validateContextItem(KPI)).toEqual({ valid: true });
  });

  it('KPI بدون روش محاسبه رد می‌شود', () => {
    const r = validateContextItem(change(KPI, { calculationMethod: '' }));
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.failures.some((f) => f.field === 'calculationMethod')).toBe(true);
    }
  });

  it('جهت مطلوب اجباری و محدود است', () => {
    expect(validateContextItem(change(KPI, { direction: 'up' })).valid).toBe(false);
    expect(validateContextItem(change(KPI, { direction: 'higher_is_better' })).valid).toBe(true);
  });

  it('مقدار هدف اختیاری است ولی اگر آمد باید عدد متناهی باشد', () => {
    const noTarget = { ...KPI } as Record<string, unknown>;
    delete noTarget.targetValue;
    expect(validateContextItem(noTarget).valid).toBe(true);
    expect(validateContextItem(change(KPI, { targetValue: Number.NaN })).valid).toBe(false);
  });
});

describe('زمینه‌ی کسب‌وکار — Capability فقط اعلام‌شده', () => {
  it('نمونه‌ی درست معتبر است', () => {
    expect(validateContextItem(CAPABILITY)).toEqual({ valid: true });
  });

  it('توانمندی استنتاج‌شده رد می‌شود — «انجام داده» با «می‌تواند» یکی نیست', () => {
    const r = validateContextItem(
      change(CAPABILITY, {
        provenance: {
          source: 'AI_INFERRED',
          sourceId: 'src_engine_1',
          method: 'تحلیل محتوای منتشرشده',
          assertedAt: humanProv.assertedAt,
        },
        confidence: 0.9,
      }),
    );
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.failures.some((f) => f.problem.includes('declared capability only'))).toBe(true);
    }
  });

  it('هر سه وضعیت مصوب پذیرفته می‌شوند', () => {
    for (const st of ['available', 'planned', 'not_available']) {
      expect(validateContextItem(change(CAPABILITY, { status: st })).valid).toBe(true);
    }
  });

  it('نقش خالی در فهرست رد می‌شود', () => {
    expect(validateContextItem(change(CAPABILITY, { ownedByRoles: [''] })).valid).toBe(false);
  });
});

describe('زمینه‌ی کسب‌وکار — تازگی و رفتار کلی', () => {
  it('`validUntil` می‌تواند null باشد (بدون انقضا)', () => {
    expect(validateContextItem(FACT).valid).toBe(true);
  });

  it('تاریخ نامعتبر رد می‌شود، نه نادیده گرفته می‌شود', () => {
    expect(
      validateContextItem(
        change(FACT, { freshness: { ...freshForever, validUntil: 'به‌زودی' } }),
      ).valid,
    ).toBe(false);
    expect(validateContextItem(change(FACT, { createdAt: 'دیروز' })).valid).toBe(false);
  });

  it('`supersededBy` جایگزینی را ثبت می‌کند، نه بازنویسی', () => {
    expect(
      validateContextItem(
        change(FACT, { freshness: { ...freshForever, supersededBy: 'fact_2' } }),
      ).valid,
    ).toBe(true);
  });

  it('`businessId` اجباری است — بدون آن متعلق به هیچ‌کس نیست', () => {
    const r = validateContextItem(change(FACT, { businessId: '' }));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.failures.some((f) => f.field === 'businessId')).toBe(true);
  });

  it('ورودی غیرشیء رد می‌شود، نه اینکه استثنا پرتاب کند', () => {
    for (const bad of [null, undefined, 'x', 42, []]) {
      expect(validateContextItem(bad).valid).toBe(false);
    }
  });

  it('همه‌ی ایرادها یکجا برمی‌گردند', () => {
    const r = validateContextItem({ type: 'goal' });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.failures.length).toBeGreaterThan(4);
  });
});
