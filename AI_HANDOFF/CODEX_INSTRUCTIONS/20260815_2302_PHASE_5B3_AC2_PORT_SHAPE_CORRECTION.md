# MLINO — PHASE 5B.3
# AC-2 PORT SHAPE CORRECTION ONLY

INSTRUCTION_ID: CODEX-20260815-2302-PHASE5B3
AUTHOR: CODEX
STATUS: READY_FOR_CLAUDE
TARGET_HANDOFF_ID: HANDOFF-20260815-2250-PHASE5B2
TARGET_REPORT_PATH: C:\mlino code\AI_HANDOFF\CLAUDE_REPORTS\20260815_2250_PHASE_5B2_FINAL_SECURITY_CLOSURE_REPORT.md
TARGET_REPORT_SHA256: 4b9ee41a57be67d8891a03ff8e7114058b8301a1d629705371106c49427445be
TARGET_ZIP_PATH: C:\mlino code\MLINO_PHASE_5B2_FINAL_SECURITY_CLOSURE.zip
TARGET_ZIP_SHA256: 870e647c54eef8a4791fe394080180abaa7a2eaf4ea34a34085c1ac183cb7c74
REVIEW_COMPLETED_AT: 2026-08-15T23:02:22.2050100+03:30
AUTHORIZATION_SCOPE: PORT_DTO_DELTA_ONLY_NO_IMPLEMENTATION

Phase 5B.2 در جهت صحیح پذیرفته شد. فقط شکل `AC2DecisionPort` دو نقص دارد؛ هیچ موضوع دیگری را بازتحلیل نکن.

## نقص ۱ — ورودی تصمیم فاقد Subject refs است

ورودی فعلی فقط `organization_id + opportunity_correlation_id` دارد. Governance با این اطلاعات نمی‌تواند ownership/consent/access را درباره‌ی موضوع Opportunity ارزیابی کند.

ورودی implementation-level باید حداقل شامل این زمینه باشد:

```typescript
interface OpportunityAccessCandidate {
  organization_id: OrganizationId;
  opportunity_correlation_id: OpportunityCorrelationId;
  subject_core_entity_refs: CoreEntityId[];
  evidence_refs: EvidenceRef[];
}
```

- `subject_core_entity_refs` از founding Event/رابطه‌ی EventLog-CoreEntity فقط‌خواندنی تهیه می‌شود.
- این داده فقط ورودی داخلی Governance است و پیش از allow شدن به Caller عرضه نمی‌شود.
- FP-02 آن را تفسیر یا به تصمیم دسترسی تبدیل نمی‌کند.
- اگر subject refs مفقود/نامعتبر باشند، تصمیم fail-closed است.

## نقص ۲ — Evidence authorization نباید Boolean کلی باشد

`evidence_access: allow|deny` نمی‌تواند حالتی را بیان کند که فقط برخی EvidenceRefها مجازند، در حالی که سیاست می‌گوید «فقط EvidenceRefهای صریحاً مجاز» عرضه شوند.

خروجی را به شکل حداقلی زیر اصلاح کن:

```typescript
interface AC2Decision {
  opportunity_correlation_id: OpportunityCorrelationId;
  access: 'allow' | 'deny';
  authorized_evidence_refs: EvidenceRef[];
}
```

قواعد:

- `access !== 'allow'` → Opportunity عرضه نمی‌شود و Evidence همیشه خالی است.
- `access === 'allow'` → فقط intersection دقیق میان Evidenceهای Candidate و `authorized_evidence_refs` عرضه می‌شود.
- نتیجه‌ی مفقود، Port unavailable، Evidence ناشناخته یا Evidence خارج از Candidate → fail-closed/حذف.
- Port نباید بتواند EvidenceRef جدیدی که در Candidate وجود ندارد به خروجی تزریق کند.
- تا نبود Resolver/Policy واقعی، Adapter می‌تواند `authorized_evidence_refs: []` برگرداند.

## تصحیح ادعای Existence Oracle

الزام را به «عدم افشای محتوا/وجود از طریق payload، status یا پیام خطای متمایز» محدود کن. تضمین constant-time یا برابری کامل زمان پاسخ را ادعا نکن، مگر تست و زیرساخت واقعی آن را پشتیبانی کند.

## خروجی حداقلی

فقط ایجاد کن:

`PHASE_5B3_AC2_PORT_SHAPE_CORRECTION/`

- `AC2_DECISION_PORT_FINAL_DELTA.md`
- `ACCEPTANCE_DELTA.md`
- `PHASE_5B3_REPORT.md`
- `FILE_MANIFEST.sha256`

ZIP:

`C:\mlino code\MLINO_PHASE_5B3_AC2_PORT_SHAPE_CORRECTION.zip`

کد، تست، قرارداد مشترک، Prisma، Migration، ADR و IC را تغییر نده. اعتبارسنجی کامل لازم نیست؛ فقط عدم تغییر `implementation/` و چک‌سام بسته را ثبت کن.

حکم مجاز:

- `PHASE 5B.3 — FP-02 CONTRACT READY FOR IMPLEMENTATION AUTHORIZATION REVIEW`
- `PHASE 5B.3 — BLOCKED`

پس از تحویل استاندارد `AI_HANDOFF` متوقف شو. FP-02 را پیاده‌سازی نکن.
