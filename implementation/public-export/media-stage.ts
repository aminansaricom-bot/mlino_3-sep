import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PublicCatalogExportV1 } from './catalog-builder';
import { CatalogMedia, mediaPath, readVerifiedMedia, validateMediaStore, verifyMediaBytes } from './media';

export function referencedMedia(artifact: PublicCatalogExportV1): CatalogMedia[] {
  const unique = new Map<string, CatalogMedia>();
  for (const record of artifact.records) for (const item of record.items) for (const media of item.media) {
    mediaPath(media);
    unique.set(media.path, media);
  }
  return [...unique.values()].sort((a, b) => a.path.localeCompare(b.path));
}

// Verify the destination as well as the source; a poisoned content-addressed file is never replaced.
export async function stageMedia(source: string, destination: string, artifact: PublicCatalogExportV1): Promise<void> {
  const root = await validateMediaStore(destination);
  // Preflight every reference before installing any media. A poisoned or missing
  // later file must not leave an earlier file installed for a skipped catalog.
  const pending: Array<{ meta: CatalogMedia; bytes: Buffer; target: string }> = [];
  for (const meta of referencedMedia(artifact)) {
    const bytes = await readVerifiedMedia(source, meta);
    const target = path.join(root, ...meta.path.split('/'));
    let parent = root;
    for (const component of meta.path.split('/').slice(0, -1)) {
      parent = path.join(parent, component);
      await fs.mkdir(parent).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'EEXIST') throw error; });
      const stat = await fs.lstat(parent);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('CATALOG_MEDIA_PATH');
    }
    const existing = await fs.lstat(target).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (existing) {
      if (!existing.isFile() || existing.isSymbolicLink()) throw new Error('CATALOG_MEDIA_POISONED');
      const old = await fs.readFile(target);
      if (createHash('sha256').update(old).digest('hex') !== meta.sha256) throw new Error('CATALOG_MEDIA_POISONED');
      verifyMediaBytes(old, meta);
      continue;
    }
    pending.push({ meta, bytes, target });
  }
  for (const { meta, bytes, target } of pending) {
    const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
    try {
      const file = await fs.open(temp, 'wx', 0o600);
      try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
      // Exclusive link enforces write-once even if another publisher wins the race.
      await fs.link(temp, target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const current = await fs.readFile(target);
      if (createHash('sha256').update(current).digest('hex') !== meta.sha256) throw new Error('CATALOG_MEDIA_POISONED');
      verifyMediaBytes(current, meta);
    } finally { await fs.rm(temp, { force: true }); }
  }
}
