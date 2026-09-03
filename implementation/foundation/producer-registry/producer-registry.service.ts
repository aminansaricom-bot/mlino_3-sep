import { prisma } from '../prisma-client';
import { DomainTag } from '../../shared-contracts/types';

/**
 * FP-01 sub-component: registry of authorized Domain Signal Producers.
 * Mirrors the pattern of Kernel §14's Shared Connector Infrastructure —
 * a lightweight registry, not a decision-making authority (IC-13 §16).
 *
 * No producer may call submitEventCandidate without a prior, explicit
 * registration here. This is the "no generic plugin backdoor" control.
 */
export interface ProducerRegistration {
  producerId: string;
  producerKind: 'value_engine' | 'interaction_layer';
  allowedDomainTags: DomainTag[];
}

export async function registerProducer(reg: ProducerRegistration): Promise<void> {
  await prisma.domainSignalProducerRegistry.upsert({
    where: { producerId: reg.producerId },
    create: {
      producerId: reg.producerId,
      producerKind: reg.producerKind,
      allowedDomainTags: reg.allowedDomainTags,
      active: true,
    },
    update: {
      producerKind: reg.producerKind,
      allowedDomainTags: reg.allowedDomainTags,
    },
  });
}

export interface ProducerLookupResult {
  found: boolean;
  active: boolean;
  allowedDomainTags: string[];
}

export async function lookupProducer(producerId: string): Promise<ProducerLookupResult> {
  const row = await prisma.domainSignalProducerRegistry.findUnique({
    where: { producerId },
  });
  if (!row) {
    return { found: false, active: false, allowedDomainTags: [] };
  }
  return { found: true, active: row.active, allowedDomainTags: row.allowedDomainTags };
}

/**
 * V1 Core seed registration — the four producers named in IC-13 §16's closed
 * domain_tag list. Call once at process startup (idempotent via upsert).
 */
export async function seedV1CoreProducerRegistry(): Promise<void> {
  await registerProducer({
    producerId: 'value-engine:capacity',
    producerKind: 'value_engine',
    allowedDomainTags: ['opportunity.capacity'],
  });
  await registerProducer({
    producerId: 'value-engine:cancellation',
    producerKind: 'value_engine',
    allowedDomainTags: ['opportunity.cancellation'],
  });
  await registerProducer({
    producerId: 'value-engine:followup',
    producerKind: 'value_engine',
    allowedDomainTags: ['opportunity.followup'],
  });
  await registerProducer({
    producerId: 'interaction-layer:ui',
    producerKind: 'interaction_layer',
    allowedDomainTags: ['opportunity.interaction'],
  });
}
