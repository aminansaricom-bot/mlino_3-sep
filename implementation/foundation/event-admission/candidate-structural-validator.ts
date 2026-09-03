import { EventCandidateDTO } from '../../shared-contracts/types';

/**
 * REMEDIATION R2 (Central Review — IC-13 runtime validation): TypeScript
 * typing alone does not protect the IC-13 admission boundary — any caller
 * that bypasses the compiler can submit anything at runtime. This module
 * performs the structural/type/enum checks that back IC-13's frozen
 * "(د) ساختار payload کامل است" ("payload structure is complete") clause
 * (Interaction_Contracts_v1.1_FROZEN.md §5) plus the one numeric bound the
 * Shared Contract explicitly specifies: `confidence_level` ∈ [0,1]
 * (PHASE_4B…CONTRACTS.md:32).
 *
 * Deliberately NOT enforced here: a numeric range on `materiality_score`.
 * No authoritative document (Kernel, ADR-00AD, CONTRACTS.md) defines one —
 * see implementation/remediation/WAVE_1_SURGICAL_REMEDIATION_REPORT.md §5
 * ("CONTRACT UNDERSPECIFICATION"). Only its TYPE (finite number) is checked
 * here; inventing a bound would be exactly the kind of guessed-range
 * invention this remediation was explicitly told not to do.
 */

const EVENT_TYPES = ['OCCURRENCE', 'AMENDMENT', 'RETRACTION'] as const;
const INTENDED_AUDIENCES = ['owner_manager', 'receptionist_coordinator', 'both'] as const;
const INTERACTION_TYPES = ['SEEN', 'ACKNOWLEDGED', 'DISMISSED'] as const;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isValidIsoTimestamp(v: unknown): boolean {
  return isNonEmptyString(v) && Number.isFinite(Date.parse(v));
}

export function isStructurallyValidCandidate(candidate: EventCandidateDTO): boolean {
  // --- Envelope (EventCandidateDTO top-level fields) ---
  if (!isNonEmptyString(candidate.producer_id)) return false;
  if (!isNonEmptyString(candidate.organization_id)) return false;
  if (!isNonEmptyString(candidate.domain_tag)) return false;
  if (!(EVENT_TYPES as readonly string[]).includes(candidate.event_type)) return false;
  if (!Array.isArray(candidate.core_entity_refs)) return false;
  if (!candidate.core_entity_refs.every((id) => isNonEmptyString(id))) return false;
  if (
    candidate.opportunity_correlation_id !== undefined &&
    !isNonEmptyString(candidate.opportunity_correlation_id)
  ) {
    return false;
  }
  if (!isValidIsoTimestamp(candidate.producer_timestamp)) return false;
  if (!isFiniteNumber(candidate.confidence_level)) return false;
  if (candidate.confidence_level < 0 || candidate.confidence_level > 1) return false;
  if (candidate.kernel_version !== 'v1.3') return false;
  // R5: situation_key is optional but, if present, must be a non-empty string.
  if (candidate.situation_key !== undefined && !isNonEmptyString(candidate.situation_key)) {
    return false;
  }

  // --- Payload (union type: OpportunityDetectionPayload | InteractionRecordPayload) ---
  if (!candidate.payload || typeof candidate.payload !== 'object') return false;
  const payload = candidate.payload as unknown as Record<string, unknown>;

  if (candidate.domain_tag === 'opportunity.interaction') {
    if (!(INTERACTION_TYPES as readonly string[]).includes(payload.interaction_type as string)) {
      return false;
    }
    if (!isNonEmptyString(payload.actor_id)) return false; // R6 (v1.1): renamed from actor_core_entity_id
    // Forbidden combination: an interaction payload must not also carry
    // detection-only fields — the two payload shapes are a discriminated
    // union in the Shared Contract, never both at once.
    if ('materiality_score' in payload || 'materiality_basis' in payload) return false;
  } else {
    if (!Array.isArray(payload.evidence_refs)) return false;
    for (const ref of payload.evidence_refs as unknown[]) {
      if (!ref || typeof ref !== 'object') return false;
      if (!isNonEmptyString((ref as Record<string, unknown>).event_id)) return false;
    }
    if (!isFiniteNumber(payload.materiality_score)) return false; // type only, no range — see file header
    if (!isNonEmptyString(payload.materiality_basis)) return false;
    if (!(INTENDED_AUDIENCES as readonly string[]).includes(payload.intended_audience as string)) {
      return false;
    }
    if (payload.expires_at !== undefined && !isValidIsoTimestamp(payload.expires_at)) return false;
    if ('interaction_type' in payload) return false; // forbidden combination, see above
  }

  return true;
}
