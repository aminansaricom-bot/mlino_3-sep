import { PrismaClient } from '@prisma/client';
import { MembershipService } from '../../core/membership-service';
import { PermissionGrantService } from '../../core/permission-grant-service';
import { CoreIdentity, IDENTITY_PROVIDER } from '../../identity';
import { contextFor, RouteError } from './core-routes';

/**
 * Members and permissions of one organization, for the business panel (/api/biz/:org/members…).
 * Every write goes through the Core services, so Core's own rules hold unchanged (D-57):
 * adding needs `membership.create`, granting needs `permission_grant.issue` AND holding the key being granted,
 * no self-grant, and the last grant administrator can never be removed. The panel only ever sees the last four
 * digits of a member's number.
 */

export interface MemberDeps {
  readonly prisma: PrismaClient;
  readonly memberships: MembershipService;
  readonly grants: PermissionGrantService;
  readonly identity: CoreIdentity;
}

/** Holding any of these lets a member see the member list. */
const ADMIN_KEYS = ['membership.create', 'membership.revoke', 'permission_grant.issue', 'permission_grant.revoke'] as const;
const UUID = '[0-9a-f-]{36}';

export async function handleMemberRoute(deps: MemberDeps, personId: string, orgId: string, rest: string, method: string, body: () => Promise<Record<string, unknown>>): Promise<unknown | undefined> {
  const context = contextFor(personId, orgId);

  if (rest === '/members' && method === 'GET') {
    const [members, grants] = await Promise.all([
      deps.prisma.membership.findMany({ where: { organizationId: orgId, membershipStatus: 'ACTIVE' }, select: { id: true, identityProvider: true, externalSubject: true, createdAt: true }, orderBy: { createdAt: 'asc' } }),
      deps.prisma.permissionGrant.findMany({ where: { organizationId: orgId, grantStatus: 'ACTIVE' }, select: { id: true, membershipId: true, permissionKey: true, basisKey: true } }),
    ]);
    const me = members.find((m) => m.identityProvider === IDENTITY_PROVIDER && m.externalSubject === personId);
    if (!me) throw new RouteError(403, 'MEMBERSHIP_REQUIRED');
    const myKeys = grants.filter((g) => g.membershipId === me.id).map((g) => g.permissionKey);
    if (!ADMIN_KEYS.some((k) => myKeys.includes(k))) throw new RouteError(403, 'ADMIN_REQUIRED');
    const hints = await deps.identity.phoneHints(members.filter((m) => m.identityProvider === IDENTITY_PROVIDER).map((m) => m.externalSubject));
    return {
      me: me.id,
      myKeys,
      // Only keys the caller holds can be granted by the caller (Core rule); the panel offers just these.
      grantable: myKeys.includes('permission_grant.issue') ? myKeys.filter((k) => deps.grants.isGrantable(k)) : [],
      members: members.map((m) => {
        const hint = m.identityProvider === IDENTITY_PROVIDER ? hints.get(m.externalSubject) : undefined;
        const own = grants.filter((g) => g.membershipId === m.id);
        return {
          membershipId: m.id,
          phoneHint: hint?.phoneHint ?? null,
          test: hint?.test ?? false,
          founding: own.some((g) => g.basisKey === 'founding'),
          isMe: m.id === me.id,
          since: m.createdAt.toISOString(),
          grants: own.map((g) => ({ grantId: g.id, key: g.permissionKey, founding: g.basisKey === 'founding' })),
        };
      }),
    };
  }

  if (rest === '/members' && method === 'POST') {
    const b = await body();
    const { personId: target } = await deps.identity.personForPhone(String(b.phone ?? ''));
    const existing = await deps.prisma.membership.findFirst({ where: { organizationId: orgId, identityProvider: IDENTITY_PROVIDER, externalSubject: target, membershipStatus: 'ACTIVE' }, select: { id: true } });
    if (existing) throw new RouteError(409, 'ALREADY_MEMBER');
    const m = await deps.memberships.create(context, { organizationId: orgId, identityProvider: IDENTITY_PROVIDER, externalSubject: target });
    return { membershipId: m.id };
  }

  const grant = rest.match(new RegExp(`^/members/(${UUID})/grants$`));
  if (grant && method === 'POST') {
    const b = await body();
    const key = String(b.key ?? '');
    if (!deps.grants.isGrantable(key)) throw new RouteError(400, 'INPUT_INVALID', { field: 'key' });
    const g = await deps.grants.issue(context, grant[1], key, 'panel: granted by a member');
    return { grantId: g.id };
  }

  const revokeGrant = rest.match(new RegExp(`^/grants/(${UUID})/revoke$`));
  if (revokeGrant && method === 'POST') {
    await deps.grants.revoke(context, revokeGrant[1], 'panel: revoked by a member');
    return { ok: true };
  }

  const remove = rest.match(new RegExp(`^/members/(${UUID})/revoke$`));
  if (remove && method === 'POST') {
    const self = await deps.prisma.membership.findFirst({ where: { id: remove[1], organizationId: orgId, identityProvider: IDENTITY_PROVIDER, externalSubject: personId }, select: { id: true } });
    // Leaving is not offered here: a member removing themself by mistake could lock the business out.
    if (self) throw new RouteError(409, 'SELF_REMOVAL');
    await deps.memberships.revoke(context, remove[1], 'panel: removed by a member');
    return { ok: true };
  }

  return undefined;
}
