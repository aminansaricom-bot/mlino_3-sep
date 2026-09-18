import { snapshotId } from './canonical';
import { instant, mapRecords, near, visibleAt, type PublicRecord } from './mapping';
import { TrustBundle } from './trustBundle';
import type { PublicExportTransport } from './transport';
import { verifyArtifact } from './verify';

export const FETCH_INTERVAL_MS = 60_000;
export const TTL_MS = 300_000;
export const MAX_CLOCK_SKEW_MS = 30_000;

type Accepted = Readonly<{
  generatedAt: number;
  snapshotId: string;
  keyId: string;
  records: readonly PublicRecord[];
}>;

function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

// Device-clock TTL is a correctness/UX guard, not a security boundary. Actual withdrawal
// freshness depends on the producer's export cycle; a compromised device clock can mislead this check.
export class PublicExportConsumer {
  private accepted: Accepted | null = null;
  private pending: Promise<void> | null = null;

  constructor(private readonly transport: PublicExportTransport, private readonly trust: TrustBundle) {}

  refresh(now = Date.now()): Promise<void> {
    if (this.pending) return this.pending;
    const work = this.load(now);
    this.pending = work;
    void work.finally(() => { if (this.pending === work) this.pending = null; }).catch(() => {});
    return work;
  }

  private async load(now: number): Promise<void> {
    const raw = await this.transport.read();
    const artifact = await verifyArtifact(raw, this.trust);
    const generatedAt = instant(artifact.generated_at);
    if (generatedAt > now + MAX_CLOCK_SKEW_MS || now > generatedAt + TTL_MS) throw new Error('PUBLIC_EXPORT_EXPIRED_OR_FUTURE');
    if (typeof artifact.snapshot_id !== 'string' || !Array.isArray(artifact.records)) throw new Error('PUBLIC_EXPORT_SNAPSHOT_SHAPE');
    if (artifact.snapshot_id !== await snapshotId('mlino.v2.public-business.v1', artifact.records)) throw new Error('PUBLIC_EXPORT_SNAPSHOT_ID');
    const mapped = mapRecords(artifact.records);
    const signature = artifact.signature as { key_id: string };
    const prior = this.accepted;
    if (prior && (generatedAt < prior.generatedAt || (generatedAt === prior.generatedAt && artifact.snapshot_id !== prior.snapshotId))) throw new Error('PUBLIC_EXPORT_OLDER');
    if (prior && generatedAt === prior.generatedAt && artifact.snapshot_id === prior.snapshotId) return;
    const next = freezeDeep({ generatedAt, snapshotId: artifact.snapshot_id, keyId: signature.key_id, records: mapped });
    // One reference swap; readers already holding the prior object finish consistently.
    this.accepted = next;
  }

  private current(now: number): Accepted | null {
    const value = this.accepted;
    if (!value || !this.trust.publicKey(value.keyId) || value.generatedAt > now + MAX_CLOCK_SKEW_MS || now > value.generatedAt + TTL_MS) return null;
    return value;
  }

  get snapshotId(): string | null { return this.accepted?.snapshotId ?? null; }
  hasValidSnapshot(now = Date.now()): boolean { return this.current(now) !== null; }
  read(now = Date.now()): readonly PublicRecord[] {
    const value = this.current(now);
    return value ? value.records.map((record) => visibleAt(record, now)) : [];
  }
  getById(id: string, now = Date.now()): PublicRecord | null {
    return this.read(now).find((record) => record.business.organization_id === id) ?? null;
  }
  findNear(latitude: number, longitude: number, radiusMeters: number, now = Date.now()) {
    return near(this.read(now), latitude, longitude, radiusMeters);
  }
}
