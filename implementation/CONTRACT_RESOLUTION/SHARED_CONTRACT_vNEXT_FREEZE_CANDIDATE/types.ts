/**
 * MLINO V1 Core — Shared Implementation Contracts
 *
 * v1.1 — CONTRACT RESOLUTION PASS (R4/R5/R6), candidate for freeze.
 * Base: PHASE_4B_DISTRIBUTED_IMPLEMENTATION_PLAN/01_SHARED_CONTRACTS/MLINO_SHARED_IMPLEMENTATION_CONTRACTS_v1/CONTRACTS.md
 * Changes from v1: see CONTRACT_RESOLUTION/SHARED_CONTRACT_vNEXT_CHANGELOG.md
 * (R4: EVIDENCE_REF_NOT_FOUND/EVIDENCE_REF_CROSS_TENANT rejection codes;
 *  R5: optional situation_key on EventCandidateDTO;
 *  R6: ActorCoreEntityId split into CoreEntityId (subject) + ActorId (actor) —
 *  see CONTRACT_RESOLUTION/R6_ACTOR_SUBJECT_CONTRACT_CHANGE.md.)
 *
 * Do not modify, fork, or shadow-copy these types locally in any Feature.
 * If insufficient, produce a CONTRACT_CHANGE_REQUEST instead of editing this file.
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
  /** Deterministic stable business-situation identity, producer-computed. Detection-family OCCURRENCE candidates only. See R5. New in v1.1. */
  situation_key?: SituationKey;
}

export type RejectionReasonCode =
  | 'PRODUCER_NOT_REGISTERED'
  | 'PRODUCER_INACTIVE'
  | 'DOMAIN_TAG_NOT_ALLOWED_FOR_PRODUCER'
  | 'CORE_ENTITY_REF_UNRESOLVED'
  | 'PAYLOAD_INCOMPLETE'
  | 'OPPORTUNITY_CORRELATION_ID_INVALID'
  /** New in v1.1 (R4) — evidence_refs[].event_id does not resolve to a real Event Log row. */
  | 'EVIDENCE_REF_NOT_FOUND'
  /** New in v1.1 (R4) — evidence_refs[].event_id resolves, but belongs to a different organization. */
  | 'EVIDENCE_REF_CROSS_TENANT';

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
