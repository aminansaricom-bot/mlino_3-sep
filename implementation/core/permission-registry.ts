export const CORE_PERMISSION_KEYS = [
  'organization.archive', 'business_profile.manage', 'capability.manage', 'offer.manage', 'evidence.manage', 'publication.manage',
  'membership.revoke', 'permission_grant.revoke', 'identity_claim.review', 'identity_verification.decide', 'membership.create',
  'permission_grant.issue', 'identity_claim.submit', 'identity_verification.start', 'capability.confirm', 'evidence.confirm',
] as const;
export type CorePermissionKey = (typeof CORE_PERMISSION_KEYS)[number];
export const GRANT_ADMIN_PERMISSION = 'permission_grant.issue' as const;
export const MEMBERSHIP_ADMIN_PERMISSION = 'membership.create' as const;
export function isCorePermissionKey(value: string): value is CorePermissionKey { return (CORE_PERMISSION_KEYS as readonly string[]).includes(value); }
