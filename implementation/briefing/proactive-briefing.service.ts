import { IC14ReadInterface, ActorContext, OpportunityCorrelationId, DomainTag } from '../shared-contracts/types';

/**
 * F-05 — Proactive Business Briefing.
 * PROFILE 0 (deterministic, mandatory, must work standalone) is implemented
 * here. PROFILE 1 (optional LLM polish) is represented by an injectable,
 * optional AiSummarizer port with MANDATORY silent fallback to PROFILE 0 on
 * any failure — per FEATURE_CONTRACTS/F-05 §23/§26.
 *
 * This Feature never detects new Opportunities and never writes any Event —
 * it is a pure read/presentation layer over IC14ReadInterface (FP-02).
 */
export interface AiSummarizer {
  polish(templateText: string): Promise<string>;
}

export interface BriefingResponse {
  summary_text: string;
  profile_used: '0' | '1';
  referenced_opportunities: OpportunityCorrelationId[];
  generated_at: string;
}

const FAMILY_LABELS: Partial<Record<DomainTag, string>> = {
  'opportunity.capacity': 'فرصت ظرفیت',
  'opportunity.cancellation': 'کنسلی/عدم‌حضور',
  'opportunity.followup': 'پیگیری',
};

export class ProactiveBriefingService {
  constructor(
    private readonly readInterface: IC14ReadInterface,
    private readonly aiSummarizer?: AiSummarizer,
  ) {}

  private buildProfile0Summary(
    grouped: Partial<Record<DomainTag, { opportunity_correlation_id: string }[]>>,
  ): { text: string; ids: string[] } {
    const parts: string[] = [];
    const ids: string[] = [];
    for (const [tag, items] of Object.entries(grouped)) {
      if (!items || items.length === 0) continue;
      const label = FAMILY_LABELS[tag as DomainTag] ?? tag;
      parts.push(`${items.length} ${label}`);
      ids.push(...items.map((i) => i.opportunity_correlation_id));
    }
    if (parts.length === 0) {
      return { text: 'در حال حاضر چیز قابل‌توجهی یافت نشد.', ids: [] };
    }
    return { text: parts.join('، ') + ' در انتظار بررسی شماست.', ids };
  }

  async getBriefing(actor: ActorContext): Promise<BriefingResponse> {
    const feed = await this.readInterface.getOpportunityFeed({ actor });
    const { text: templateText, ids } = this.buildProfile0Summary(feed.opportunities_by_family);

    if (!this.aiSummarizer) {
      return { summary_text: templateText, profile_used: '0', referenced_opportunities: ids, generated_at: new Date().toISOString() };
    }

    try {
      const polished = await this.aiSummarizer.polish(templateText);
      return { summary_text: polished, profile_used: '1', referenced_opportunities: ids, generated_at: new Date().toISOString() };
    } catch {
      // MANDATORY silent fallback — the user must never see an AI-layer error.
      return { summary_text: templateText, profile_used: '0', referenced_opportunities: ids, generated_at: new Date().toISOString() };
    }
  }
}
