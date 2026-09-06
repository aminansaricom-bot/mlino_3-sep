import { IncomingMessage, ServerResponse, createServer, Server } from 'node:http';
import { AuthenticationError, AuthorizationError, resolveActorContext } from '../foundation/auth-adapter/auth-adapter';
import { ActorContext, DomainTag, ALLOWED_DOMAIN_TAGS } from '../shared-contracts/types';
import { V1Container, buildContainer, disposeContainer } from '../composition/container';

/**
 * V1 read-only HTTP boundary — approved Option 4
 * (V1_COMPOSITION_ROOT_DESIGN.md §2.1, product-owner decision 6 Sep 2026).
 *
 * ⚠️ NOT PRODUCTION-SAFE, and this file will not pretend otherwise. There is
 * no approved deploy infrastructure (no HTTPS termination, no secret manager,
 * no monitoring, no network access control). This is the localhost/testing
 * bridge described in the design doc §4, built so the approved AC-2 adapter
 * stops being unreachable code. Nothing here should be exposed publicly.
 *
 * DEPENDENCY CHOICE: `node:http` from the standard library, per the reviewer's
 * stated preference. No framework was added. The surface is three read routes
 * plus one interaction write; a router, middleware stack, and body-parser
 * ecosystem would all be dead weight against that, and every dependency added
 * here is one more thing to audit before this is ever deployed.
 *
 * SCOPE: read paths plus interaction recording (which completes IC-13/IC-14).
 * NO detection route, NO scheduler, NO worker, NO connector.
 *
 * TOKENS: V1 issues nothing. JWTs come from Malino; `resolveActorContext`
 * only verifies them (product-owner decision). There is deliberately no login
 * page, no token endpoint, and no user store here.
 */

/** Routes are matched exactly; anything else is a uniform 404. */
const ROUTE_FEED = '/v1/opportunities';
const ROUTE_BRIEFING = '/v1/briefing';
const ROUTE_BY_ID_PREFIX = '/v1/opportunities/';
const INTERACTION_SUFFIX = '/interaction';

const VALID_INTERACTIONS = new Set(['SEEN', 'ACKNOWLEDGED', 'DISMISSED']);

/** Bodies are tiny by construction; anything larger is refused rather than buffered. */
const MAX_BODY_BYTES = 4 * 1024;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    // Defensive headers: responses carry tenant data and must never be cached
    // by an intermediary, and must never be sniffed into another content type.
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(payload);
}

/**
 * Every failure the client is allowed to see. Deliberately opaque:
 *  - 401 says only that authentication failed — never WHY (missing vs malformed
 *    vs expired vs bad signature), because that distinction helps an attacker
 *    and helps nobody else.
 *  - 404 is uniform. See `handleById`.
 *  - 500 carries no internal detail, no stack, no error message.
 */
function sendError(res: ServerResponse, status: number): void {
  const messages: Record<number, string> = {
    400: 'bad request',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'not found',
    405: 'method not allowed',
    413: 'payload too large',
    500: 'internal error',
  };
  sendJson(res, status, { error: messages[status] ?? 'error' });
}

function bearerFrom(req: IncomingMessage): string | undefined {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return undefined;
  const match = /^Bearer (.+)$/.exec(header.trim());
  return match ? match[1] : undefined;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > MAX_BODY_BYTES) throw new PayloadTooLargeError();
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

class PayloadTooLargeError extends Error {}

/**
 * GET /v1/opportunities[?domain_tag=...]
 *
 * The read service already applies, in IC-14's fixed order: org scoping, AC-2
 * (via the real adapter), audience filtering, actor interaction state, and
 * grouping. This handler adds nothing to that and must not — it only passes
 * the validated actor through.
 */
async function handleFeed(
  container: V1Container,
  actor: ActorContext,
  url: URL,
  res: ServerResponse,
): Promise<void> {
  const raw = url.searchParams.get('domain_tag');
  if (raw !== null && !(ALLOWED_DOMAIN_TAGS as readonly string[]).includes(raw)) {
    // An unknown domain_tag is a malformed request, not an empty result — saying
    // so leaks nothing, since the allowed set is part of the public contract.
    sendError(res, 400);
    return;
  }
  const feed = await container.feedService.getFeed({
    actor,
    ...(raw !== null ? { domain_tag_filter: raw as DomainTag } : {}),
  });
  sendJson(res, 200, feed);
}

/**
 * GET /v1/opportunities/:id
 *
 * EXISTENCE-ORACLE RULE (mandatory, design doc §2.2 item 2): the read service
 * returns null for BOTH "no such Opportunity" and "exists but you may not see
 * it" — deliberately indistinguishable. This boundary MUST preserve that by
 * answering an identical 404 in both cases.
 *
 * Returning 403 for the denied case would hand any authenticated user an
 * existence oracle for other organizations' Opportunity ids, re-opening at the
 * HTTP layer exactly the leak the read layer closed. 403 is therefore reserved
 * strictly for an AuthorizationError raised while establishing the actor — a
 * fact about the caller's own token, which reveals nothing about what exists.
 */
async function handleById(
  container: V1Container,
  actor: ActorContext,
  id: string,
  res: ServerResponse,
): Promise<void> {
  const dto = await container.feedService.getById(id, actor);
  if (dto === null) {
    sendError(res, 404); // identical for not-found and not-permitted
    return;
  }
  sendJson(res, 200, dto);
}

/** POST /v1/opportunities/:id/interaction  { "interaction_type": "SEEN" } */
async function handleInteraction(
  container: V1Container,
  actor: ActorContext,
  id: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = await readBody(req);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    sendError(res, 400);
    return;
  }

  const type = (parsed as { interaction_type?: unknown } | null)?.interaction_type;
  if (typeof type !== 'string' || !VALID_INTERACTIONS.has(type)) {
    sendError(res, 400);
    return;
  }

  // Recording an interaction on an Opportunity the actor cannot see would itself
  // be an existence oracle, so the same read gate runs first and the same uniform
  // 404 applies. The admission boundary (IC-13) re-validates independently.
  const visible = await container.feedService.getById(id, actor);
  if (visible === null) {
    sendError(res, 404);
    return;
  }

  const result = await container.feedService.recordInteraction(
    id,
    type as 'SEEN' | 'ACKNOWLEDGED' | 'DISMISSED',
    actor,
  );
  sendJson(res, result.admission_result === 'accepted' ? 202 : 400, {
    admission_result: result.admission_result,
  });
}

/** GET /v1/briefing */
async function handleBriefing(
  container: V1Container,
  actor: ActorContext,
  res: ServerResponse,
): Promise<void> {
  const briefing = await container.briefingService.getBriefing(actor);
  sendJson(res, 200, briefing);
}

export function createRequestHandler(container: V1Container) {
  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = url.pathname;

      // Authentication first, for every route: no endpoint is anonymous.
      let actor: ActorContext;
      try {
        actor = resolveActorContext(bearerFrom(req));
      } catch (err) {
        // 401 for authentication, 403 only for an explicit authorization failure.
        // Neither says anything about what exists.
        sendError(res, err instanceof AuthorizationError ? 403 : 401);
        return;
      }

      if (path === ROUTE_FEED) {
        if (req.method !== 'GET') return sendError(res, 405);
        return await handleFeed(container, actor, url, res);
      }

      if (path === ROUTE_BRIEFING) {
        if (req.method !== 'GET') return sendError(res, 405);
        return await handleBriefing(container, actor, res);
      }

      if (path.startsWith(ROUTE_BY_ID_PREFIX)) {
        const rest = path.slice(ROUTE_BY_ID_PREFIX.length);

        if (rest.endsWith(INTERACTION_SUFFIX)) {
          const id = rest.slice(0, -INTERACTION_SUFFIX.length);
          if (id.length === 0 || id.includes('/')) return sendError(res, 404);
          if (req.method !== 'POST') return sendError(res, 405);
          return await handleInteraction(container, actor, id, req, res);
        }

        if (rest.length === 0 || rest.includes('/')) return sendError(res, 404);
        if (req.method !== 'GET') return sendError(res, 405);
        return await handleById(container, actor, rest, res);
      }

      sendError(res, 404);
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        sendError(res, 413);
        return;
      }
      // Last-resort boundary: an unexpected failure must never leak internals
      // (stack, SQL, file paths, error text) to the client. Logged server-side
      // only, which is where an operator can actually act on it.
      // eslint-disable-next-line no-console
      console.error('[v1-read-api] unhandled error:', err);
      sendError(res, 500);
    }
  };
}

export interface StartedServer {
  server: Server;
  port: number;
  /** Stops accepting connections, waits for in-flight requests, then releases Prisma. */
  close: () => Promise<void>;
}

/**
 * Starts the read API. `port: 0` asks the OS for a free port, which is what the
 * tests use so they never collide with a developer's running instance.
 */
export async function startReadApi(port = Number(process.env.PORT ?? 0)): Promise<StartedServer> {
  const container = buildContainer();
  const server = createServer((req, res) => {
    void createRequestHandler(container)(req, res);
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));
  const address = server.address();
  const boundPort = typeof address === 'object' && address !== null ? address.port : port;

  return {
    server,
    port: boundPort,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await disposeContainer();
    },
  };
}
