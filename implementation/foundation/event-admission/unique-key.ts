import { createHash } from 'crypto';

/**
 * Kernel §4 composite uniqueness key: source + source-scoped-id + content hash.
 * Owned exclusively by FP-01 — no producer implements its own hashing formula
 * (prevents divergence between Value Engines).
 *
 * IMPORTANT (per V1_FROZEN_ARCHITECTURE_CONSISTENCY_REPORT.md / ADR-00AC identity
 * correction): this key is ONLY for idempotency of a single Event row. It is
 * NEVER used as the stable identity of an Opportunity across its lifecycle —
 * that stable identity is `opportunity_correlation_id` (the founding
 * Occurrence event's own `id`), tracked separately.
 */
export function generateUniqueKey(
  producerId: string,
  sourceRef: string,
  contentForHash: unknown,
): string {
  const contentHash = createHash('sha256')
    .update(JSON.stringify(contentForHash))
    .digest('hex');
  return `${producerId}:${sourceRef}:${contentHash}`;
}
