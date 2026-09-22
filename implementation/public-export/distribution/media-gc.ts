import { promises as fs } from 'node:fs';
import path from 'node:path';
import { canonicalBytes } from '../canonical';
import { PublicBusinessExportV1 } from '../builder';
import { CATALOG_CAP, verifyCatalogArtifact } from '../catalog-artifact';
import { referencedMedia } from '../media-stage';
import { VerificationKeyProvider, verifyEnvelope } from '../signing';
import { validateMediaStore } from '../media';

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
type Suffix = '' | '.previous-1' | '.previous-2';
const SUFFIXES: Suffix[] = ['', '.previous-1', '.previous-2'];
function fail(): never { throw new Error('CATALOG_GC_ARTIFACT'); }
async function references(directory: string, provider: VerificationKeyProvider): Promise<Set<string>> {
  const referenced = new Set<string>();
  for (const suffix of SUFFIXES) {
    const catalogFile = path.join(directory, `public-catalog.v1${suffix}.json`);
    const businessFile = path.join(directory, `public-business.v1${suffix}.json`);
    let catalogRaw: Buffer;
    try { catalogRaw = await fs.readFile(catalogFile); }
    catch (error) {
      if (suffix && (error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      fail();
    }
    try {
      if (catalogRaw.length > CATALOG_CAP) fail();
      const businessRaw = await fs.readFile(businessFile);
      const business = JSON.parse(businessRaw.toString('utf8')) as PublicBusinessExportV1;
      if (!canonicalBytes(business).equals(businessRaw) || business.contract_version !== 'mlino.v2.public-business.v1' ||
          !(await verifyEnvelope(business, provider))) fail();
      const catalog = await verifyCatalogArtifact(catalogRaw, provider, business, new Date(business.generated_at), Number.MAX_SAFE_INTEGER);
      for (const media of referencedMedia(catalog)) referenced.add(media.path);
    } catch { fail(); }
  }
  return referenced;
}
async function candidates(directory: string, referenced: Set<string>, now: Date): Promise<string[]> {
  const base = path.join(directory, 'media', 'sha256');
  const found: string[] = [];
  const baseStat = await fs.lstat(base).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (baseStat && (!baseStat.isDirectory() || baseStat.isSymbolicLink())) fail();
  const prefixes = await fs.readdir(base, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const prefix of prefixes) {
    if (!prefix.isDirectory() || prefix.isSymbolicLink() || !/^[0-9a-f]{2}$/.test(prefix.name)) fail();
    const entries = await fs.readdir(path.join(base, prefix.name), { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || entry.isSymbolicLink() || !/^[0-9a-f]{64}\.(png|jpg|webp|avif)$/.test(entry.name)) fail();
      const rel = `media/sha256/${prefix.name}/${entry.name}`;
      if (entry.name.slice(0, 2) !== prefix.name || referenced.has(rel)) continue;
      const stat = await fs.lstat(path.join(base, prefix.name, entry.name));
      if (now.getTime() - stat.mtimeMs > RETENTION_MS) found.push(rel);
    }
  }
  return found.sort();
}
export async function catalogMediaGc(directory: string, provider: VerificationKeyProvider,
  options: { apply?: boolean; now?: Date; onCandidate?: (path: string) => void } = {}): Promise<string[]> {
  if (!path.isAbsolute(directory) || !Number.isFinite((options.now ?? new Date()).getTime())) fail();
  await validateMediaStore(directory).catch(() => fail());
  const now = options.now ?? new Date();
  const first = await candidates(directory, await references(directory, provider), now);
  if (!options.apply) { for (const item of first) options.onCandidate?.(item); return first; }
  const second = await candidates(directory, await references(directory, provider), now);
  if (first.join('\n') !== second.join('\n')) fail();
  for (const item of second) {
    const target = path.join(directory, ...item.split('/'));
    const stat = await fs.lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink() || now.getTime() - stat.mtimeMs <= RETENTION_MS) fail();
    await fs.unlink(target);
    options.onCandidate?.(item);
  }
  return second;
}
