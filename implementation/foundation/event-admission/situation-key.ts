/**
 * CONTRACT RESOLUTION R5 — deterministic computation of a producer-local
 * stable "business situation identity" key. See
 * CONTRACT_RESOLUTION/R5_STABLE_SITUATION_IDENTITY_SPEC.md for the full
 * per-Feature dimension analysis this implements.
 *
 * Deliberately NOT here: any lookup/decision logic (does an open Opportunity
 * already exist for this key?). That requires Projection/ACTIVE-state
 * knowledge which is FP-02's job, explicitly out of scope for this pass —
 * see the spec's "چرا منطق OCCURRENCE/AMENDMENT اینجا پیاده‌سازی نشد" section.
 * This module ONLY computes the key from stable dimensions — a pure
 * function, no I/O, no DB.
 */
export function computeSituationKey(producerId: string, dimensions: string[]): string {
  return [producerId, ...dimensions].join(':');
}
