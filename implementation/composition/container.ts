import { prisma } from '../foundation/prisma-client';
import { OpportunityReadService } from '../foundation/opportunity-read/opportunity-read.service';
import { orgMembershipAC2DecisionPort } from '../foundation/access-decision/org-membership-ac2-port';
import { eventAdmissionService } from '../foundation/event-admission/event-admission.service';
import { OpportunityFeedService } from '../feed/opportunity-feed.service';
import { ProactiveBriefingService } from '../briefing/proactive-briefing.service';

/**
 * V1 Composition Root — the ONE place the real object graph is assembled.
 *
 * Implements exactly the approved wiring order from V1_COMPOSITION_ROOT_DESIGN.md
 * §2.1 (Option 4, product-owner decision of 6 Sep 2026): read side only. No
 * detection cycle, no scheduler, no worker, no Malino connector — those wait
 * on the connector phase and its own authorization.
 *
 * WHY A SINGLE MODULE: the design doc's §2.2 item 3 requires one place that
 * constructs these once and injects them, rather than `new` scattered through
 * request handlers. That keeps the AC-2 adapter impossible to bypass by
 * accident: a handler cannot construct a read service with a different (or
 * missing) Port, because handlers never construct one at all.
 *
 * WHAT IS DELIBERATELY ABSENT:
 *  - `aiSummarizer` for the briefing service. It is an OPTIONAL dependency and
 *    no real implementation exists anywhere in the codebase (verified, not
 *    assumed). Passing nothing is the honest wiring; the briefing service
 *    already handles its absence. Inventing a summarizer would have been new
 *    scope.
 *  - Any detection-side repository. All three Value Engine repositories have
 *    in-memory implementations only (V1_COMPOSITION_ROOT_DESIGN.md §0.1), so
 *    there is nothing real to wire them to yet.
 */
export interface V1Container {
  readService: OpportunityReadService;
  feedService: OpportunityFeedService;
  briefingService: ProactiveBriefingService;
}

/**
 * Builds the container. Called once by the HTTP entry point — not per request.
 *
 * `orgMembershipAC2DecisionPort` is the real AC-2 adapter (V1 organizational-
 * membership policy, NOT full Kernel-AC-2 — the consent half is R8-a). Before
 * this module existed, that adapter was approved but unreachable: nothing
 * outside tests constructed a read service at all.
 */
export function buildContainer(): V1Container {
  const readService = new OpportunityReadService(orgMembershipAC2DecisionPort);

  return {
    readService,
    feedService: new OpportunityFeedService(readService, eventAdmissionService),
    // aiSummarizer intentionally omitted — see the note above.
    briefingService: new ProactiveBriefingService(readService),
  };
}

/**
 * Graceful shutdown for the one resource that owns a real connection pool
 * (design doc §2.2 item 5). Safe to call more than once: Prisma's $disconnect
 * is idempotent, and any failure is swallowed deliberately — a shutdown path
 * must not itself throw and mask the original reason for shutting down.
 */
export async function disposeContainer(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch {
    // Intentionally ignored: nothing useful can be done while shutting down.
  }
}
