/**
 * MLINO V1 Core — Shared Implementation Contracts
 *
 * v1.1 — FROZEN FOR IMPLEMENTATION (PHASE 5A.2). This is an IMPLEMENTATION
 * CONTRACT freeze, NOT a Frozen Architecture change — Kernel/ADR/IC remain
 * exactly as they were (drift = 0, reverified at freeze time).
 * Base: PHASE_4B_DISTRIBUTED_IMPLEMENTATION_PLAN/01_SHARED_CONTRACTS/MLINO_SHARED_IMPLEMENTATION_CONTRACTS_v1/CONTRACTS.md
 * Full diff/authority map: PHASE_5A2_SHARED_CONTRACT_FREEZE/02_CONTRACT_DIFF/
 *
 * TWO SEMANTIC LIMITATIONS ARE PART OF THIS FROZEN CONTRACT (Phase 5A.2
 * Central Review amendments) — see the doc comments on `EvidenceRef` and
 * `EventCandidateDTO.situation_key` below. Both R4 (Evidence Integrity) and
 * the situation_key → existing-Opportunity lookup mechanism (part of R5)
 * remain explicitly OPEN. This contract does not pretend otherwise.
 *
 * No distributed Feature implementation may modify this file. If a Feature
 * discovers this contract is missing or insufficient: STOP that dependency
 * path and produce a CONTRACT_CHANGE_REQUEST — do not silently patch it.
 */

export type OrganizationId = string;
/** A real `core_entities` row — subject / organizational-reality identity. Renamed from ActorCoreEntityId in v1.1 (R6). */
export type CoreEntityId = string;
/** Authorization/actor identity (FP-03 ActorContext). NOT required to be a core_entities row — see R6. New in v1.1. */
export type ActorId = string;
export type EventId = string;
export type OpportunityCorrelationId = string;
export type UniqueKey = string;
export type ISOTimestamp = string;
/** Producer-computed, deterministic, stable business-situation identity. Optional; detection-family OCCURRENCE candidates only. See R5. New in v1.1. */
export type SituationKey = string;

export const ALLOWED_DOMAIN_TAGS = [
  'opportunity.capacity',
  'opportunity.cancellation',
  'opportunity.followup',
  'opportunity.interaction',
] as const;
export type DomainTag = (typeof ALLOWED_DOMAIN_TAGS)[number];

export type IntendedAudience = 'owner_manager' | 'receptionist_coordinator' | 'both';

/**
 * CRITICAL SEMANTIC LIMITATION (Phase 5A.2 amendment, R4 remains OPEN):
 * `event_id` is currently an OPAQUE evidence reference. Its presence on a
 * payload does NOT mean this Shared Contract guarantees persistence,
 * existence, referential integrity, dereferenceability, or source-store
 * availability. No authoritative Evidence Store exists yet for the
 * external source events F-01/F-02/F-03 currently cite (see
 * PHASE_5A1_FP02_PREIMPLEMENTATION_CLOSURE/01_EVIDENCE/
 * EVIDENCE_REFERENCE_CONTRACT_CLOSURE.md). Until that store exists:
 *   - consumers MUST NOT assume an EvidenceRef can be dereferenced;
 *   - evidence references MUST NOT be used to bypass tenant isolation —
 *     no consumer may expose or resolve evidence belonging to another
 *     organization, even speculatively;
 *   - admission MUST NOT fabricate an existence/tenant check it cannot
 *     truthfully perform (do not reintroduce EVIDENCE_REF_NOT_FOUND /
 *     EVIDENCE_REF_CROSS_TENANT or equivalent codes until a real store
 *     backs them — see PHASE_5A1.../CONTRACT_CHANGE_REQUESTS, R4).
 */
export interface EvidenceRef {
  event_id: EventId;
  description?: string;
}

export interface OpportunityDetectionPayload {
  evidence_refs: EvidenceRef[];
  materiality_score: number;
  materiality_basis: string;
  intended_audience: IntendedAudience;
  expires_at?: ISOTimestamp;
}

export interface InteractionRecordPayload {
  interaction_type: 'SEEN' | 'ACKNOWLEDGED' | 'DISMISSED';
  /** Renamed from actor_core_entity_id in v1.1 (R6) — actor identity, not a CoreEntityId. */
  actor_id: ActorId;
}

export type EventCandidatePayload = OpportunityDetectionPayload | InteractionRecordPayload;

export interface EventCandidateDTO {
  producer_id: string;
  domain_tag: DomainTag;
  organization_id: OrganizationId;
  /** SUBJECT references only (R6). For domain_tag:'opportunity.interaction' this MAY be empty — the admission boundary fills it in from the target Opportunity's founding Occurrence. */
  core_entity_refs: CoreEntityId[];
  opportunity_correlation_id?: OpportunityCorrelationId;
  event_type: 'OCCURRENCE' | 'AMENDMENT' | 'RETRACTION';
  payload: EventCandidatePayload;
  producer_timestamp: ISOTimestamp;
  confidence_level: number;
  kernel_version: 'v1.3';
  /**
   * A stable, deterministic identity for a business situation (e.g. "this
   * resource, this date" for F-01) — producer-computed, no I/O. Detection-
   * family OCCURRENCE candidates only.
   *
   * CRITICAL SEMANTIC LIMITATION (Phase 5A.2 amendment, R5-Lookup remains
   * OPEN): this field is IDENTITY ONLY. Its presence does NOT imply, and
   * MUST NOT be treated as providing:
   *   - Opportunity uniqueness enforcement (no DB constraint backs it yet);
   *   - a lookup mechanism from situation_key to an existing Opportunity
   *     (no such mechanism exists in this contract or its implementation);
   *   - lifecycle transition authority (OCCURRENCE vs AMENDMENT is NOT
   *     decided by this field, by the producer possessing it, or by any
   *     component reading it);
   *   - resolution, suppression, or deduplication guarantees;
   *   - persistence ownership of "the current state for this situation".
   * SITUATION IDENTITY ≠ OPPORTUNITY LIFECYCLE AUTHORITY. A Value Engine
   * authorized to compute this key is NOT thereby authorized to mutate
   * Opportunity lifecycle. See
   * PHASE_5A1_FP02_PREIMPLEMENTATION_CLOSURE/02_SITUATION_IDENTITY/.
   */
  situation_key?: SituationKey;
}

// PHASE 5A.1 correction: 'EVIDENCE_REF_NOT_FOUND'/'EVIDENCE_REF_CROSS_TENANT'
// were removed here. They were declared in an earlier v1.1 draft but never
// produced by any code path — evidence_refs[].event_id in the current
// Value Engines (F-01/F-02/F-03) references EXTERNAL source-system events
// (appointment.scheduled, etc.), not event_log rows, and no store for those
// external events exists yet in this codebase. Declaring rejection codes
// for a check that cannot run would have been fake referential integrity —
// see PHASE_5A1_FP02_PREIMPLEMENTATION_CLOSURE/01_EVIDENCE/
// EVIDENCE_REFERENCE_CONTRACT_CLOSURE.md. Reintroduce these (or their
// replacement) only once FP-02/Connector design settles where source
// evidence is actually stored.
export type RejectionReasonCode =
  | 'PRODUCER_NOT_REGISTERED'
  | 'PRODUCER_INACTIVE'
  | 'DOMAIN_TAG_NOT_ALLOWED_FOR_PRODUCER'
  | 'CORE_ENTITY_REF_UNRESOLVED'
  | 'PAYLOAD_INCOMPLETE'
  | 'OPPORTUNITY_CORRELATION_ID_INVALID';

export interface AdmissionResult {
  admission_result: 'accepted' | 'rejected';
  event_id?: EventId;
  opportunity_correlation_id?: OpportunityCorrelationId;
  rejection_reason?: RejectionReasonCode;
}

export interface OpportunityActorStateDTO {
  interaction_type: 'NONE' | 'SEEN' | 'ACKNOWLEDGED' | 'DISMISSED';
  updated_at: ISOTimestamp | null;
}

export interface OpportunityProjectionDTO {
  opportunity_correlation_id: OpportunityCorrelationId;
  domain_tag: DomainTag;
  organization_id: OrganizationId;
  state: 'ACTIVE' | 'EXPIRED';
  materiality_score: number;
  materiality_basis: string;
  intended_audience: IntendedAudience;
  evidence_refs: EvidenceRef[];
  event_time: ISOTimestamp;
  expires_at: ISOTimestamp | null;
  last_computed_at: ISOTimestamp;
  my_interaction_state: OpportunityActorStateDTO;
}

export interface OpportunityEventDTO {
  event_id: EventId;
  unique_key: UniqueKey;
  event_type: 'OCCURRENCE' | 'AMENDMENT' | 'RETRACTION';
  domain_tag: DomainTag;
  opportunity_correlation_id: OpportunityCorrelationId;
  amends_event_id: EventId | null;
  event_time: ISOTimestamp;
  ingestion_time: ISOTimestamp;
  producer_type: 'internal';
  producer_id: string;
  organization_id: OrganizationId;
  confidence_level: number;
  payload: EventCandidatePayload;
}

/** IC-13 — must be the ONLY way any producer reaches the Event Log. */
export interface IC13SubmissionInterface {
  submitEventCandidate(candidate: EventCandidateDTO): Promise<AdmissionResult>;
}

export interface ActorContext {
  organization_id: OrganizationId;
  /** Renamed from actor_core_entity_id in v1.1 (R6) — actor identity, not necessarily a core_entities row. */
  actor_id: ActorId;
  role: 'owner_manager' | 'receptionist_coordinator';
}

export interface OpportunityFeedQuery {
  actor: ActorContext;
  domain_tag_filter?: DomainTag;
  cursor?: string;
  limit?: number;
}

export interface OpportunityFeedResponse {
  opportunities_by_family: Partial<Record<DomainTag, OpportunityProjectionDTO[]>>;
  cursor_next?: string;
}

/** IC-14 — enforces AC-2 -> intended_audience -> actor-state ordering internally. */
export interface IC14ReadInterface {
  getOpportunityFeed(query: OpportunityFeedQuery): Promise<OpportunityFeedResponse>;
  getOpportunityById(
    id: OpportunityCorrelationId,
    actor: ActorContext,
  ): Promise<OpportunityProjectionDTO | null>;
}

export interface PaginatedRequest {
  cursor?: string;
  limit?: number;
}

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export interface ApiErrorResponse {
  error_code: ApiErrorCode;
  message: string;
}
