import {
  issueTokenForTesting,
  resolveActorContext,
  AuthenticationError,
} from '../../foundation/auth-adapter/auth-adapter';
import jwt from 'jsonwebtoken';

describe('FP-03 — Auth Adapter (AC-2 current implementation adapter)', () => {
  it('resolves a valid token to the correct ActorContext', () => {
    const token = issueTokenForTesting({
      organization_id: 'org-1',
      actor_id: 'actor-1',
      role: 'owner_manager',
    });
    const ctx = resolveActorContext(token);
    expect(ctx).toEqual({
      organization_id: 'org-1',
      actor_id: 'actor-1',
      role: 'owner_manager',
    });
  });

  it('rejects a missing token', () => {
    expect(() => resolveActorContext(undefined)).toThrow(AuthenticationError);
  });

  it('rejects an invalid/tampered token', () => {
    expect(() => resolveActorContext('not-a-real-token')).toThrow(AuthenticationError);
  });

  it('rejects a token signed with the wrong secret (tenant/forgery protection)', () => {
    const forged = jwt.sign(
      { organization_id: 'org-1', actor_id: 'actor-1', role: 'owner_manager' },
      'wrong-secret',
    );
    expect(() => resolveActorContext(forged)).toThrow(AuthenticationError);
  });

  it('rejects a token with an unrecognized role claim', () => {
    const badRole = jwt.sign(
      { organization_id: 'org-1', actor_id: 'actor-1', role: 'superadmin' },
      process.env.MLINO_JWT_SECRET ?? 'dev-only-insecure-secret-change-me',
    );
    expect(() => resolveActorContext(badRole)).toThrow(AuthenticationError);
  });

  it('rejects a token missing required claims', () => {
    const incomplete = jwt.sign(
      { organization_id: 'org-1' },
      process.env.MLINO_JWT_SECRET ?? 'dev-only-insecure-secret-change-me',
    );
    expect(() => resolveActorContext(incomplete)).toThrow(AuthenticationError);
  });

  describe('REMEDIATION R7 — fail-closed on missing MLINO_JWT_SECRET', () => {
    // Explicit test configuration (test/setup-env.ts) sets MLINO_JWT_SECRET
    // globally for the suite; these tests temporarily unset it to prove
    // production code has NO fallback of its own, then restore it so later
    // tests (and other spec files, under maxWorkers:1) are unaffected.
    let savedSecret: string | undefined;

    beforeEach(() => {
      savedSecret = process.env.MLINO_JWT_SECRET;
    });

    afterEach(() => {
      if (savedSecret === undefined) {
        delete process.env.MLINO_JWT_SECRET;
      } else {
        process.env.MLINO_JWT_SECRET = savedSecret;
      }
    });

    it('resolveActorContext fails closed (throws AuthenticationError, not a silent insecure default) when MLINO_JWT_SECRET is unset, even with an otherwise well-formed token', () => {
      const token = jwt.sign(
        { organization_id: 'org-1', actor_id: 'actor-1', role: 'owner_manager' },
        process.env.MLINO_JWT_SECRET as string,
      );
      delete process.env.MLINO_JWT_SECRET;
      expect(() => resolveActorContext(token)).toThrow(AuthenticationError);
    });

    it('issueTokenForTesting also fails closed when MLINO_JWT_SECRET is unset — no test-only shortcut exists in production code', () => {
      delete process.env.MLINO_JWT_SECRET;
      expect(() =>
        issueTokenForTesting({
          organization_id: 'org-1',
          actor_id: 'actor-1',
          role: 'owner_manager',
        }),
      ).toThrow(AuthenticationError);
    });

    it('a valid, explicitly-configured secret continues to work correctly (org/actor/role claims all round-trip)', () => {
      process.env.MLINO_JWT_SECRET = 'a-different-explicitly-configured-secret';
      const token = issueTokenForTesting({
        organization_id: 'org-explicit',
        actor_id: 'actor-explicit',
        role: 'receptionist_coordinator',
      });
      const ctx = resolveActorContext(token);
      expect(ctx).toEqual({
        organization_id: 'org-explicit',
        actor_id: 'actor-explicit',
        role: 'receptionist_coordinator',
      });
    });
  });
});
