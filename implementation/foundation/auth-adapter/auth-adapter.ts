import jwt from 'jsonwebtoken';
import { ActorContext } from '../../shared-contracts/types';

/**
 * FP-03 — CURRENT IMPLEMENTATION ADAPTER for AC-2 (Kernel §12).
 *
 * IMPORTANT (per ARCHITECTURE_CHANGE_CONTROL_AND_WORKER_BOUNDARIES.md §"AUTH
 * IMPLEMENTATION ADAPTER"): AC-2 ≠ this file. This is a *current* adapter
 * wrapping JWT verification into the ActorContext shape every Feature
 * consumes. If the underlying auth mechanism ever changes (e.g. real
 * integration with Malino's existing `src/middleware/auth.js`), only this
 * file changes — no Feature Contract or Feature code should.
 *
 * Wave 1 note: this is a self-contained adapter with its own configurable
 * secret, NOT yet wired to Malino's live JWT_SECRET — that real wiring is a
 * deliberate, separately-reviewed integration step (Wave 2+), consistent
 * with "Legacy code boundary" (workers only touch Legacy through explicit,
 * authorized boundaries).
 *
 * REMEDIATION R7 (Central Review — JWT fail-closed): a prior module-level
 * constant computed `JWT_SECRET` as
 * `process.env.MLINO_JWT_SECRET ?? 'dev-only-insecure-secret-change-me'` —
 * meaning ANY environment missing the env var (including a misconfigured
 * production deploy) would silently start signing/verifying tokens with a
 * secret published in this very source file. That fallback is removed
 * entirely. There is no environment-based branching here (no
 * `NODE_ENV === 'test'` special case) — production behavior and test
 * behavior are now IDENTICAL code: both require `MLINO_JWT_SECRET` to be
 * explicitly set, and both fail closed (throw) if it is not. Tests satisfy
 * this via explicit test configuration (see test/setup-env.ts, loaded via
 * jest.config.js `setupFiles`), never via a hardcoded fallback in this file.
 */

export class AuthenticationError extends Error {}
export class AuthorizationError extends Error {}

interface MlinoJwtClaims {
  organization_id: string;
  // R6 (v1.1): renamed from actor_core_entity_id — actor identity is not
  // necessarily a core_entities row. The JWT claim name itself changes too,
  // consistent with the Shared Contract rename (no silent field aliasing).
  actor_id: string;
  role: 'owner_manager' | 'receptionist_coordinator';
}

function requireJwtSecret(): string {
  const secret = process.env.MLINO_JWT_SECRET;
  if (!secret) {
    // Fail closed: no default, no fallback, in any environment.
    throw new AuthenticationError(
      'MLINO_JWT_SECRET is not configured — authentication infrastructure refuses to operate without an explicit secret (fail-closed)',
    );
  }
  return secret;
}

export function issueTokenForTesting(claims: MlinoJwtClaims, expiresInSeconds = 3600): string {
  return jwt.sign(claims, requireJwtSecret(), { expiresIn: expiresInSeconds });
}

/**
 * Verifies a bearer token and returns the ActorContext every Feature reads
 * this org/actor/role triple from. Throws AuthenticationError for a
 * missing/invalid/expired token, or for a missing server-side secret
 * (fail-closed) — callers (API layer) map that to 401.
 */
export function resolveActorContext(bearerToken: string | undefined): ActorContext {
  if (!bearerToken) {
    throw new AuthenticationError('missing bearer token');
  }
  const secret = requireJwtSecret();
  let decoded: MlinoJwtClaims;
  try {
    decoded = jwt.verify(bearerToken, secret) as MlinoJwtClaims;
  } catch {
    throw new AuthenticationError('invalid or expired token');
  }
  if (!decoded.organization_id || !decoded.actor_id || !decoded.role) {
    throw new AuthenticationError('malformed token claims');
  }
  if (decoded.role !== 'owner_manager' && decoded.role !== 'receptionist_coordinator') {
    throw new AuthenticationError('unrecognized role claim');
  }
  return {
    organization_id: decoded.organization_id,
    actor_id: decoded.actor_id,
    role: decoded.role,
  };
}
