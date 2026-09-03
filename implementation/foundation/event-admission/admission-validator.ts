import { prisma } from '../prisma-client';
import { lookupProducer } from '../producer-registry/producer-registry.service';
import { EventCandidateDTO, RejectionReasonCode, ALLOWED_DOMAIN_TAGS } from '../../shared-contracts/types';
import { isStructurallyValidCandidate } from './candidate-structural-validator';

/**
 * FP-01 sub-component: the "limited AC-1-equivalent" candidate validation
 * described in IC-13 §8. This is NOT full AC-1 — it does not re-map raw
 * external signals to Core Entities (Domain Adaptation's job for external
 * Connectors, IC-01); it only re-confirms what the producer already claims,
 * since the producer resolved core_entity_refs itself from a Projection
 * read before calling here.
 */
export interface ValidationResult {
  valid: boolean;
  reason?: RejectionReasonCode;
}

export async function validateEventCandidate(
  candidate: EventCandidateDTO,
): Promise<ValidationResult> {
  // (0) REMEDIATION R2 (Central Review — IC-13 runtime validation): full
  // structural/type/enum check of the candidate, run BEFORE any DB call.
  // Without this, a caller that bypasses TypeScript (a malformed
  // producer_id, a non-array core_entity_refs, etc.) could reach a raw
  // Prisma query below and throw an uncaught PrismaClientValidationError
  // instead of a graceful rejection — the boundary must fail closed. See
  // candidate-structural-validator.ts for exactly what is and is not
  // checked (notably: confidence_level's [0,1] bound IS contract-specified
  // and enforced; materiality_score's range is NOT specified anywhere and
  // is deliberately left unbounded — only type-checked).
  if (!isStructurallyValidCandidate(candidate)) {
    return { valid: false, reason: 'PAYLOAD_INCOMPLETE' };
  }

  // (a) producer registered and active
  const producer = await lookupProducer(candidate.producer_id);
  if (!producer.found) {
    return { valid: false, reason: 'PRODUCER_NOT_REGISTERED' };
  }
  if (!producer.active) {
    return { valid: false, reason: 'PRODUCER_INACTIVE' };
  }

  // (b) domain_tag in the closed allow-list, and allowed for this specific producer
  if (!ALLOWED_DOMAIN_TAGS.includes(candidate.domain_tag)) {
    return { valid: false, reason: 'DOMAIN_TAG_NOT_ALLOWED_FOR_PRODUCER' };
  }
  if (!producer.allowedDomainTags.includes(candidate.domain_tag)) {
    return { valid: false, reason: 'DOMAIN_TAG_NOT_ALLOWED_FOR_PRODUCER' };
  }

  // (c) core_entity_refs must still resolve against current Projection (core_entities table)
  // R6 (v1.1) correction: for domain_tag:'opportunity.interaction', core_entity_refs
  // MAY be empty — ACTOR IDENTITY ≠ SUBJECT COREENTITY IDENTITY. The actor is
  // never required to be a registered CoreEntity; the correct subject refs
  // (the target Opportunity's founding Occurrence's own refs) are filled in
  // by event-admission.service.ts AFTER this validation passes, using the
  // founding event already resolved for the Amendment-target check below.
  // If a caller DOES supply explicit refs (any domain_tag), they are still
  // held to full resolvability — this only relaxes the empty case, and only
  // for the interaction family. See CONTRACT_RESOLUTION/R6_ACTOR_SUBJECT_CONTRACT_CHANGE.md.
  if (candidate.core_entity_refs.length === 0) {
    if (candidate.domain_tag !== 'opportunity.interaction') {
      return { valid: false, reason: 'CORE_ENTITY_REF_UNRESOLVED' };
    }
  } else {
    const resolvedCount = await prisma.coreEntity.count({
      where: {
        id: { in: candidate.core_entity_refs },
        organizationId: candidate.organization_id,
      },
    });
    if (resolvedCount !== candidate.core_entity_refs.length) {
      return { valid: false, reason: 'CORE_ENTITY_REF_UNRESOLVED' };
    }
  }

  // (d) payload completeness — now covered exhaustively by (0) above.
  // (Old shallow check removed; (0) subsumes it.)

  // (d.2) CONTRACT RESOLUTION R4 — evidence reference integrity: NOT
  // implemented here. An attempt to check evidence_refs[].event_id against
  // `event_log` was made during this pass and immediately falsified every
  // real F-01/F-02/F-03 candidate (see
  // CONTRACT_RESOLUTION/WAVE_1_CONTRACT_RESOLUTION_REPORT.md §3 for the
  // full account): those Features' evidence cites EXTERNAL source-system
  // event ids (appointment.scheduled / working_hours.defined /
  // appointment.cancelled / appointment.noshow / patient.interaction_recorded
  // — Kernel event catalog group A) which are NEVER persisted into our
  // `event_log` table (`event_log` holds only OUR OWN admitted
  // opportunity.* domain events). No Connector/Projection store for those
  // external events exists yet in this codebase (that is FP-02 / real
  // Malino wiring, explicitly out of scope). Checking against the wrong
  // table would either reject every legitimate candidate (as it briefly
  // did) or, if quietly narrowed to "only check when it happens to match",
  // provide no real integrity guarantee at all while looking closed. R4 is
  // reclassified BLOCKED pending that architectural clarification — see
  // remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_EVIDENCE_INTEGRITY.md
  // (updated) for the corrected scope.

  // (e) Amendment/Retraction — target integrity.
  // REMEDIATION R3 (Central Review — amendment target integrity): the prior
  // check only established "target exists + same organization". That is
  // not sufficient — it would accept an Amendment pointing at, say, an
  // unrelated AMENDMENT row, or an OCCURRENCE from a different domain_tag
  // family, as long as the id happened to exist in the same org. Per
  // ADR-00AC's identity model (governance/ADR-00AC-Opportunity-Architecture.md:37),
  // `opportunity_correlation_id` is BY DEFINITION "= id رویداد Occurrence
  // بنیان‌گذار" (= the id of the founding Occurrence event) — every
  // Amendment/Retraction's reference must therefore resolve to a row that
  // is (i) an OCCURRENCE, not another Amendment/Retraction, and (ii) in the
  // same domain_tag family, since Projections are family-scoped. Both
  // checks are reported via the existing OPPORTUNITY_CORRELATION_ID_INVALID
  // code — CONTRACTS.md's own comment on that code ("for Amendment/
  // Retraction with an invalid reference") never defines "invalid", and a
  // target that is not itself a founding Occurrence, or belongs to a
  // different family, is invalid under any reasonable reading of that text.
  // This is a strengthening of an EXISTING, already-mandated check, not a
  // new admission-check category — see
  // implementation/remediation/WAVE_1_SURGICAL_REMEDIATION_REPORT.md §7 for
  // the full reasoning and what was deliberately NOT invented here
  // (evidence_refs integrity — R4 — was escalated instead; see
  // CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_EVIDENCE_INTEGRITY.md).
  if (candidate.event_type !== 'OCCURRENCE') {
    if (!candidate.opportunity_correlation_id) {
      return { valid: false, reason: 'OPPORTUNITY_CORRELATION_ID_INVALID' };
    }
    const founding = await prisma.eventLog.findUnique({
      where: { id: candidate.opportunity_correlation_id },
    });
    if (!founding || founding.organizationId !== candidate.organization_id) {
      return { valid: false, reason: 'OPPORTUNITY_CORRELATION_ID_INVALID' };
    }
    if (founding.eventType !== 'OCCURRENCE') {
      return { valid: false, reason: 'OPPORTUNITY_CORRELATION_ID_INVALID' };
    }
    // Domain/family match is required WITHIN a detection family (an
    // opportunity.capacity Amendment must target an opportunity.capacity
    // founding Occurrence, never a cancellation/followup one) — but
    // `opportunity.interaction` is a cross-cutting family: F-04's
    // SEEN/ACKNOWLEDGED/DISMISSED records legitimately amend a founding
    // Occurrence from ANY of the three detection families (that is the
    // whole point of an interaction record — reacting to an Opportunity
    // regardless of which Value Engine produced it). Confirmed by actual
    // usage: opportunity-feed.service.ts always submits
    // domain_tag:'opportunity.interaction' while its target's founding
    // Occurrence carries the ORIGINAL detection domain_tag. Discovered by
    // running test/feed/opportunity-feed.spec.ts against an earlier,
    // stricter version of this check during remediation — see
    // WAVE_1_REMEDIATION_CHANGELOG.md.
    if (
      candidate.domain_tag !== 'opportunity.interaction' &&
      founding.domainTag !== candidate.domain_tag
    ) {
      return { valid: false, reason: 'OPPORTUNITY_CORRELATION_ID_INVALID' };
    }
  }

  return { valid: true };
}
