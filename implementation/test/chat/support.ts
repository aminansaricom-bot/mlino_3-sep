import crypto from 'node:crypto';
import { Pool } from 'pg';
import { IDENTITY_SCHEMA_SQL } from '../../identity';
import { CHAT_SCHEMA_SQL } from '../../chat';

/** Disposable test DB only (guarded by setup-env). Chat lives in its own schema here, as its own database in production. */
export const TEST_ORG = 'test-demo-chat-spec';

export function pools(): { core: Pool; chat: Pool } {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL (disposable :5499) is required');
  return { core: new Pool({ connectionString: url, max: 3 }), chat: new Pool({ connectionString: url, max: 3, options: '-c search_path=chat_spec' }) };
}

export async function resetSchemas(core: Pool, chat: Pool): Promise<void> {
  await core.query('DROP SCHEMA IF EXISTS core_identity CASCADE');
  await core.query(IDENTITY_SCHEMA_SQL);
  await core.query('DROP SCHEMA IF EXISTS chat_spec CASCADE; CREATE SCHEMA chat_spec');
  await chat.query(CHAT_SCHEMA_SQL);
  await dropTestOrg(core);
}

export async function dropTestOrg(core: Pool): Promise<void> {
  await core.query(`DELETE FROM permission_grants WHERE membership_id IN (SELECT id FROM memberships WHERE identity_provider = 'mlino-phone')`);
  await core.query(`DELETE FROM memberships WHERE identity_provider = 'mlino-phone'`);
  await core.query('DELETE FROM permission_grants WHERE organization_id = $1', [TEST_ORG]);
  await core.query('DELETE FROM memberships WHERE organization_id = $1', [TEST_ORG]);
  await core.query('DELETE FROM organizations WHERE id = $1', [TEST_ORG]);
}

/** A fictional organization with one founding member, as the demo seed makes them. */
export async function createTestOrg(core: Pool): Promise<void> {
  await core.query(`INSERT INTO organizations (id, display_name, lifecycle_status, updated_at) VALUES ($1, 'کافه آزمون', 'ACTIVE', now())`, [TEST_ORG]);
  const founder = crypto.randomUUID();
  await core.query(`INSERT INTO memberships (id, organization_id, identity_provider, external_subject, membership_status) VALUES ($1, $2, 'test-seed', 'founder', 'ACTIVE')`, [founder, TEST_ORG]);
  await core.query(`INSERT INTO permission_grants (id, organization_id, membership_id, permission_key, grant_status, basis_key) VALUES ($1, $2, $3, 'membership.create', 'ACTIVE', 'founding')`, [crypto.randomUUID(), TEST_ORG, founder]);
}

export class Clock {
  t: number;
  constructor(iso = '2026-09-24T08:00:00Z') { this.t = Date.parse(iso); }
  now = () => new Date(this.t);
  advance(ms: number): void { this.t += ms; }
}
