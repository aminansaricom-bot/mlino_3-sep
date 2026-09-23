// Attachments (پیوست) for accounting documents: photos of receipts, supplier invoices, cheque images, PDFs.
// They support a document; they never change the books. Linked by the document id (source.documentId).
// Demo: kept in this browser's IndexedDB (metadata and bytes in separate stores so lists stay light).
// Real product (A2): content-addressed private media store (sha256 path, like catalog media), per organization.

export type AttachmentMeta = Readonly<{
  id: string;
  docId: string;
  name: string;
  type: string;
  size: number;
  sha256: string;
  addedAt: string;
}>;

export const ATTACHMENT_LIMITS = { maxFiles: 5, maxBytes: 5 * 1024 * 1024, maxImageSide: 1800 } as const;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

const DB = 'mlino-accounting-demo';
let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('NO_INDEXEDDB')); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      const meta = db.createObjectStore('meta', { keyPath: 'id' });
      meta.createIndex('docId', 'docId');
      db.createObjectStore('blobs');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}
function result<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}

async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Large phone photos are scaled down (receipts stay readable, storage stays small). */
async function shrinkImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/heic' || file.type === 'image/heif' || typeof createImageBitmap === 'undefined') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, ATTACHMENT_LIMITS.maxImageSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1_500_000) { bitmap.close(); return file; }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return out && out.size < file.size ? out : file;
  } catch {
    return file;
  }
}

export type AddResult = Readonly<{ added: AttachmentMeta[]; rejected: string[] }>;

export async function addAttachments(docId: string, files: readonly File[]): Promise<AddResult> {
  const existing = await listAttachments(docId);
  const added: AttachmentMeta[] = [];
  const rejected: string[] = [];
  for (const file of files) {
    if (existing.length + added.length >= ATTACHMENT_LIMITS.maxFiles) { rejected.push(`${file.name}: حداکثر ${ATTACHMENT_LIMITS.maxFiles} پیوست برای هر سند`); continue; }
    const type = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '');
    if (!ALLOWED.includes(type)) { rejected.push(`${file.name}: فقط عکس یا PDF`); continue; }
    const blob = await shrinkImage(file);
    if (blob.size > ATTACHMENT_LIMITS.maxBytes) { rejected.push(`${file.name}: بیشتر از ۵ مگابایت`); continue; }
    const renamed = blob !== file && !/\.jpe?g$/i.test(file.name) ? `${file.name.replace(/\.[^.]+$/, '')}.jpg` : file.name;
    const meta: AttachmentMeta = {
      id: `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      docId,
      name: renamed.slice(0, 120),
      type: blob.type || type,
      size: blob.size,
      sha256: await sha256(blob),
      addedAt: new Date().toISOString(),
    };
    const db = await open();
    const tx = db.transaction(['meta', 'blobs'], 'readwrite');
    tx.objectStore('meta').put(meta);
    tx.objectStore('blobs').put(blob, meta.id);
    await done(tx);
    added.push(meta);
  }
  return { added, rejected };
}

export async function listAttachments(docId: string): Promise<AttachmentMeta[]> {
  try {
    const db = await open();
    const rows = await result(db.transaction('meta').objectStore('meta').index('docId').getAll(docId) as IDBRequest<AttachmentMeta[]>);
    return rows.sort((a, b) => a.addedAt.localeCompare(b.addedAt));
  } catch {
    return [];
  }
}

/** Number of attachments per document, for badges in lists. */
export async function attachmentCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  try {
    const db = await open();
    const rows = await result(db.transaction('meta').objectStore('meta').getAll() as IDBRequest<AttachmentMeta[]>);
    for (const r of rows) counts.set(r.docId, (counts.get(r.docId) ?? 0) + 1);
  } catch { /* no storage: no badges */ }
  return counts;
}

export async function attachmentBlob(id: string): Promise<Blob | null> {
  const db = await open();
  return (await result(db.transaction('blobs').objectStore('blobs').get(id) as IDBRequest<Blob | undefined>)) ?? null;
}

export async function removeAttachment(id: string): Promise<void> {
  const db = await open();
  const tx = db.transaction(['meta', 'blobs'], 'readwrite');
  tx.objectStore('meta').delete(id);
  tx.objectStore('blobs').delete(id);
  await done(tx);
}

export async function clearAttachments(): Promise<void> {
  try {
    const db = await open();
    const tx = db.transaction(['meta', 'blobs'], 'readwrite');
    tx.objectStore('meta').clear();
    tx.objectStore('blobs').clear();
    await done(tx);
  } catch { /* nothing stored */ }
}
