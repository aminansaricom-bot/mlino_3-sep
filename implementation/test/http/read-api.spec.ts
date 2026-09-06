import { prisma } from '../../foundation/prisma-client';
import { seedV1CoreProducerRegistry } from '../../foundation/producer-registry/producer-registry.service';
import { eventAdmissionService } from '../../foundation/event-admission/event-admission.service';
import { rebuildOrganizationProjection } from '../../foundation/opportunity-projection/rebuild-projection.service';
import { issueTokenForTesting } from '../../foundation/auth-adapter/auth-adapter';
import { startReadApi, StartedServer } from '../../http/read-api';
import { EventCandidateDTO } from '../../shared-contracts/types';

/**
 * HTTP boundary tests — real server, real Postgres, real AC-2 adapter.
 *
 * Nothing is mocked here on purpose: the whole point of this layer is that the
 * approved adapter is genuinely reachable, so the tests drive it through an
 * actual socket rather than by calling the services directly.
 */

const ORG_A = 'org-http-A';
const ORG_B = 'org-http-B';

let api: StartedServer;
let base: string;

function tokenFor(org: string, actorId: string, role: 'owner_manager' | 'receptionist_coordinator') {
  return issueTokenForTesting({ organization_id: org, actor_id: actorId, role });
}

async function call(
  path: string,
  init: { method?: string; token?: string; body?: unknown } = {},
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {};
  if (init.token !== undefined) headers.authorization = `Bearer ${init.token}`;
  if (init.body !== undefined) headers['content-type'] = 'application/json';

  const res = await fetch(`${base}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  return { status: res.status, body: text.length > 0 ? JSON.parse(text) : null };
}

async function seedEntity(id: string, org = ORG_A) {
  await prisma.coreEntity.create({
    data: { id, organizationId: org, entityType: 'Individual', domainTag: 'test.resource' },
  });
}

async function seedOccurrence(overrides: Partial<EventCandidateDTO> = {}) {
  const candidate: EventCandidateDTO = {
    producer_id: 'value-engine:capacity',
    domain_tag: 'opportunity.capacity',
    organization_id: ORG_A,
    core_entity_refs: ['entity-http-1'],
    event_type: 'OCCURRENCE',
    payload: {
      evidence_refs: [],
      materiality_score: 0.8,
      materiality_basis: 'http boundary test',
      intended_audience: 'both',
    },
    producer_timestamp: '2026-08-15T10:00:00.000Z',
    confidence_level: 1.0,
    kernel_version: 'v1.3',
    ...overrides,
  } as EventCandidateDTO;
  return eventAdmissionService.submitEventCandidate(candidate);
}

beforeAll(async () => {
  await seedV1CoreProducerRegistry();
  api = await startReadApi(0); // OS-assigned port, never collides with a dev server
  base = `http://127.0.0.1:${api.port}`;
});

afterAll(async () => {
  await api.close();
  await prisma.$disconnect();
});

afterEach(async () => {
  await prisma.opportunityInteractionState.deleteMany({});
  await prisma.opportunityCurrentState.deleteMany({});
  await prisma.eventLog.deleteMany({});
  await prisma.admissionObservability.deleteMany({});
  await prisma.coreEntity.deleteMany({});
});

describe('V1 read API — authentication', () => {
  it('401 when the Authorization header is absent', async () => {
    const res = await call('/v1/opportunities');
    expect(res.status).toBe(401);
  });

  it('401 when the token is malformed', async () => {
    const res = await call('/v1/opportunities', { token: 'not-a-jwt' });
    expect(res.status).toBe(401);
  });

  it('401 when the token is expired', async () => {
    const expired = issueTokenForTesting(
      { organization_id: ORG_A, actor_id: 'manager-A', role: 'owner_manager' },
      -1,
    );
    const res = await call('/v1/opportunities', { token: expired });
    expect(res.status).toBe(401);
  });

  it('the 401 body never explains why authentication failed', async () => {
    const missing = await call('/v1/opportunities');
    const malformed = await call('/v1/opportunities', { token: 'not-a-jwt' });
    // Byte-identical: an attacker learns nothing from comparing the two.
    expect(missing.body).toEqual(malformed.body);
    expect(JSON.stringify(missing.body)).not.toMatch(/expired|signature|malformed|secret|jwt/i);
  });
});

describe('V1 read API — feed', () => {
  it('returns only the actor\'s own organization, already filtered by AC-2 and audience', async () => {
    await seedEntity('entity-http-1');
    await seedOccurrence();
    await seedEntity('entity-http-b', ORG_B);
    await seedOccurrence({ organization_id: ORG_B, core_entity_refs: ['entity-http-b'] });
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');
    await rebuildOrganizationProjection(ORG_B, '2026-08-16T00:00:00.000Z');

    const res = await call('/v1/opportunities', { token: tokenFor(ORG_A, 'manager-A', 'owner_manager') });
    expect(res.status).toBe(200);
    const all = Object.values(res.body.opportunities_by_family).flat() as any[];
    expect(all.length).toBe(1);
    expect(all[0].organization_id).toBe(ORG_A);
  });

  it('applies the audience filter: a manager-only Opportunity is absent from a receptionist feed', async () => {
    await seedEntity('entity-http-1');
    await seedOccurrence({
      payload: {
        evidence_refs: [],
        materiality_score: 0.9,
        materiality_basis: 'manager only',
        intended_audience: 'owner_manager',
      },
    });
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

    const reception = await call('/v1/opportunities', {
      token: tokenFor(ORG_A, 'reception-A', 'receptionist_coordinator'),
    });
    expect(Object.values(reception.body.opportunities_by_family).flat().length).toBe(0);

    const manager = await call('/v1/opportunities', {
      token: tokenFor(ORG_A, 'manager-A', 'owner_manager'),
    });
    expect(Object.values(manager.body.opportunities_by_family).flat().length).toBe(1);
  });

  it('groups by domain_tag and rejects an unknown domain_tag filter as a bad request', async () => {
    await seedEntity('entity-http-1');
    await seedOccurrence();
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');
    const token = tokenFor(ORG_A, 'manager-A', 'owner_manager');

    const ok = await call('/v1/opportunities?domain_tag=opportunity.capacity', { token });
    expect(ok.status).toBe(200);
    expect(Object.keys(ok.body.opportunities_by_family)).toEqual(['opportunity.capacity']);

    const bad = await call('/v1/opportunities?domain_tag=opportunity.nonsense', { token });
    expect(bad.status).toBe(400);
  });
});

describe('V1 read API — by-id and the existence oracle', () => {
  it('returns the Opportunity to a permitted actor', async () => {
    await seedEntity('entity-http-1');
    const occ = await seedOccurrence();
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');

    const res = await call(`/v1/opportunities/${occ.opportunity_correlation_id}`, {
      token: tokenFor(ORG_A, 'manager-A', 'owner_manager'),
    });
    expect(res.status).toBe(200);
    expect(res.body.opportunity_correlation_id).toBe(occ.opportunity_correlation_id);
  });

  it('MANDATORY: a nonexistent id and another organization\'s real id are indistinguishable — both 404, byte-identical', async () => {
    await seedEntity('entity-http-b', ORG_B);
    const otherOrg = await seedOccurrence({
      organization_id: ORG_B,
      core_entity_refs: ['entity-http-b'],
    });
    await rebuildOrganizationProjection(ORG_B, '2026-08-16T00:00:00.000Z');

    const token = tokenFor(ORG_A, 'manager-A', 'owner_manager');
    const nonexistent = await call('/v1/opportunities/00000000-0000-0000-0000-000000000000', { token });
    const forbidden = await call(`/v1/opportunities/${otherOrg.opportunity_correlation_id}`, { token });

    expect(nonexistent.status).toBe(404);
    expect(forbidden.status).toBe(404); // NOT 403 — that would be an existence oracle
    expect(nonexistent.body).toEqual(forbidden.body);
  });

  it('405 for a wrong method rather than a silent success', async () => {
    const res = await call('/v1/opportunities/some-id', {
      method: 'DELETE',
      token: tokenFor(ORG_A, 'manager-A', 'owner_manager'),
    });
    expect(res.status).toBe(405);
  });
});

describe('V1 read API — interaction recording', () => {
  it('records SEEN through the HTTP path and it survives into the Projection', async () => {
    await seedEntity('entity-http-1');
    const occ = await seedOccurrence();
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');
    const token = tokenFor(ORG_A, 'manager-A', 'owner_manager');

    const res = await call(`/v1/opportunities/${occ.opportunity_correlation_id}/interaction`, {
      method: 'POST',
      token,
      body: { interaction_type: 'SEEN' },
    });
    expect(res.status).toBe(202);
    expect(res.body.admission_result).toBe('accepted');

    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');
    const feed = await call('/v1/opportunities', { token });
    const opp = (Object.values(feed.body.opportunities_by_family).flat() as any[])[0];
    expect(opp.my_interaction_state.interaction_type).toBe('SEEN');
  });

  it('rejects an unknown interaction type and a malformed body', async () => {
    await seedEntity('entity-http-1');
    const occ = await seedOccurrence();
    await rebuildOrganizationProjection(ORG_A, '2026-08-16T00:00:00.000Z');
    const token = tokenFor(ORG_A, 'manager-A', 'owner_manager');
    const path = `/v1/opportunities/${occ.opportunity_correlation_id}/interaction`;

    expect((await call(path, { method: 'POST', token, body: { interaction_type: 'LIKED' } })).status).toBe(400);
    expect((await call(path, { method: 'POST', token, body: {} })).status).toBe(400);
  });

  it('recording against another organization\'s Opportunity is the same uniform 404, not 403', async () => {
    await seedEntity('entity-http-b', ORG_B);
    const otherOrg = await seedOccurrence({
      organization_id: ORG_B,
      core_entity_refs: ['entity-http-b'],
    });
    await rebuildOrganizationProjection(ORG_B, '2026-08-16T00:00:00.000Z');

    const res = await call(`/v1/opportunities/${otherOrg.opportunity_correlation_id}/interaction`, {
      method: 'POST',
      token: tokenFor(ORG_A, 'manager-A', 'owner_manager'),
      body: { interaction_type: 'SEEN' },
    });
    expect(res.status).toBe(404);

    // and nothing was written
    const written = await prisma.eventLog.count({ where: { domainTag: 'opportunity.interaction' } });
    expect(written).toBe(0);
  });
});

describe('V1 read API — error handling and shutdown', () => {
  it('an unknown route is 404, and no route is anonymous', async () => {
    expect((await call('/v1/nope')).status).toBe(401); // auth runs before routing
    expect(
      (await call('/v1/nope', { token: tokenFor(ORG_A, 'manager-A', 'owner_manager') })).status,
    ).toBe(404);
  });

  it('an internal failure returns 500 with no internal detail leaked', async () => {
    const spy = jest.spyOn(prisma.opportunityCurrentState, 'findMany').mockRejectedValueOnce(
      new Error('SELECT * FROM opportunity_current_state failed at /internal/path.ts:42'),
    );
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await call('/v1/opportunities', { token: tokenFor(ORG_A, 'manager-A', 'owner_manager') });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/SELECT|internal\/path|failed at/i);

    spy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('graceful shutdown closes the listener so the port stops accepting connections', async () => {
    const temp = await startReadApi(0);
    const probe = `http://127.0.0.1:${temp.port}/v1/opportunities`;
    expect((await fetch(probe)).status).toBe(401); // alive

    await temp.close();

    await expect(fetch(probe)).rejects.toThrow(); // no longer accepting
  });
});
