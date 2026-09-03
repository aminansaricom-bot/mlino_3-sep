import { ProactiveBriefingService, AiSummarizer } from '../../briefing/proactive-briefing.service';
import { MockIC14ReadInterface } from '../mocks/mock-ic14-read-interface';
import { ActorContext, OpportunityProjectionDTO } from '../../shared-contracts/types';

const managerA: ActorContext = { organization_id: 'org-briefing', actor_id: 'manager-1', role: 'owner_manager' };

function makeOpp(overrides: Partial<Omit<OpportunityProjectionDTO, 'my_interaction_state'>> = {}) {
  return {
    opportunity_correlation_id: 'opp-1',
    domain_tag: 'opportunity.capacity' as const,
    organization_id: 'org-briefing',
    state: 'ACTIVE' as const,
    materiality_score: 0.8,
    materiality_basis: 'test',
    intended_audience: 'both' as const,
    evidence_refs: [],
    event_time: new Date().toISOString(),
    expires_at: null,
    last_computed_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('F-05 — Proactive Business Briefing', () => {
  it('happy path (PROFILE 0): produces a valid deterministic summary referencing the opportunities', async () => {
    const mock = new MockIC14ReadInterface();
    mock.seedOpportunity(makeOpp());
    const service = new ProactiveBriefingService(mock); // no AI summarizer -> PROFILE 0 only

    const briefing = await service.getBriefing(managerA);
    expect(briefing.profile_used).toBe('0');
    expect(briefing.referenced_opportunities).toEqual(['opp-1']);
    expect(briefing.summary_text.length).toBeGreaterThan(0);
  });

  it('boundary: zero opportunities produces an honest message, not fabricated content', async () => {
    const mock = new MockIC14ReadInterface();
    const service = new ProactiveBriefingService(mock);

    const briefing = await service.getBriefing(managerA);
    expect(briefing.referenced_opportunities).toEqual([]);
    expect(briefing.summary_text).toMatch(/یافت نشد/);
  });

  it('MANDATORY fallback: AI summarizer failure still returns a valid PROFILE 0 briefing, never an error', async () => {
    const mock = new MockIC14ReadInterface();
    mock.seedOpportunity(makeOpp());
    const failingSummarizer: AiSummarizer = {
      polish: async () => {
        throw new Error('AI provider unavailable');
      },
    };
    const service = new ProactiveBriefingService(mock, failingSummarizer);

    const briefing = await service.getBriefing(managerA);
    expect(briefing.profile_used).toBe('0');
    expect(briefing.summary_text.length).toBeGreaterThan(0);
  });

  it('PROFILE 1 success path: uses the polished text when the summarizer succeeds', async () => {
    const mock = new MockIC14ReadInterface();
    mock.seedOpportunity(makeOpp());
    const workingSummarizer: AiSummarizer = {
      polish: async (t) => `polished: ${t}`,
    };
    const service = new ProactiveBriefingService(mock, workingSummarizer);

    const briefing = await service.getBriefing(managerA);
    expect(briefing.profile_used).toBe('1');
    expect(briefing.summary_text).toMatch(/^polished:/);
  });

  it('architecture invariant: this Feature never submits an Event Candidate (no IC-13 dependency at all)', () => {
    const source = require('fs').readFileSync(
      require.resolve('../../briefing/proactive-briefing.service.ts'),
      'utf-8',
    );
    expect(source).not.toMatch(/IC13SubmissionInterface|submitEventCandidate/);
  });
});
