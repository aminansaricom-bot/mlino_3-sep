import crypto from 'node:crypto';
import type { Pool } from 'pg';
import { CoreIdentity, IDENTITY_PROVIDER } from '../../identity';
import { CHAT_PERMISSION } from '../../chat';

/**
 * Demo only. Makes one fictional test identity a member of every fictional
 * `test-demo-*` organization, with the module permission `chat.reply`, granted
 * by that organization's existing founding membership (basis `member_grant`,
 * D-57). Refuses any organization outside the test-demo range and any number
 * outside the test range. Idempotent.
 */
export async function seedDemoMembers(core: Pool, identity: CoreIdentity, phone: string): Promise<{ added: number; existing: number }> {
  const personId = await identity.ensureTestPerson(phone);
  const orgs = await core.query<{ id: string }>(`SELECT id FROM organizations WHERE id LIKE 'test-demo-%' AND lifecycle_status = 'ACTIVE' ORDER BY id`);
  let added = 0;
  let existing = 0;
  for (const { id: orgId } of orgs.rows) {
    const db = await core.connect();
    try {
      await db.query('BEGIN');
      const founder = await db.query<{ id: string }>(
        `SELECT m.id FROM memberships m JOIN permission_grants g ON g.membership_id = m.id AND g.organization_id = m.organization_id
          WHERE m.organization_id = $1 AND m.membership_status = 'ACTIVE' AND g.basis_key = 'founding' AND g.grant_status = 'ACTIVE'
          ORDER BY m.created_at LIMIT 1`, [orgId]);
      if (!founder.rows[0]) { await db.query('ROLLBACK'); continue; }
      let member = await db.query<{ id: string }>(
        `SELECT id FROM memberships WHERE organization_id = $1 AND identity_provider = $2 AND external_subject = $3 AND membership_status = 'ACTIVE'`,
        [orgId, IDENTITY_PROVIDER, personId]);
      if (!member.rows[0]) {
        member = await db.query<{ id: string }>(
          `INSERT INTO memberships (id, organization_id, identity_provider, external_subject, membership_status) VALUES ($1, $2, $3, $4, 'ACTIVE') RETURNING id`,
          [crypto.randomUUID(), orgId, IDENTITY_PROVIDER, personId]);
      }
      const grant = await db.query(
        `INSERT INTO permission_grants (id, organization_id, membership_id, permission_key, grant_status, basis_key, granted_by_membership_id, granted_by_organization_id, reason)
         VALUES ($1, $2, $3, $4, 'ACTIVE', 'member_grant', $5, $2, 'demo: fictional test identity answers demo chats')
         ON CONFLICT DO NOTHING`,
        [crypto.randomUUID(), orgId, member.rows[0].id, CHAT_PERMISSION, founder.rows[0].id]);
      await db.query('COMMIT');
      if (grant.rowCount) added += 1; else existing += 1;
    } catch (e) {
      await db.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      db.release();
    }
  }
  return { added, existing };
}
