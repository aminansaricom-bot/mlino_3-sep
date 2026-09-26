import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, type VisualSearchModule } from './index';
import { MODEL_FILE, MODEL_SHA256, MODEL_URL } from './model';

/**
 * Setup and evaluation for visual search (D-91). `fetchVisualModel` is the only step that reaches the internet: it
 * downloads the pinned model once, checks its SHA-256 and moves it into place; after that the server runs offline.
 */
export async function fetchVisualModel(dir: string): Promise<string> {
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, MODEL_FILE);
  if (fs.existsSync(target) && crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex') === MODEL_SHA256) return `already in place: ${target}`;
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`model download answered ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  if (digest !== MODEL_SHA256) throw new Error(`model download has SHA-256 ${digest}, expected ${MODEL_SHA256}`);
  const part = `${target}.part`;
  fs.writeFileSync(part, bytes);
  fs.renameSync(part, target);
  return `downloaded and verified: ${target} (${bytes.length} bytes)`;
}

type Sharp = typeof import('sharp').default;
const sharp = (): Sharp => require('sharp') as Sharp; // eslint-disable-line @typescript-eslint/no-var-requires

const pct = (xs: number[], p: number) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; };
const f = (x: number) => (Number.isFinite(x) ? x.toFixed(3) : '-');

/** Different views of a catalog photo: none of them is the stored image itself. */
async function variants(img: Buffer): Promise<Array<{ kind: string; bytes: Buffer }>> {
  const s = sharp();
  const meta = await s(img).metadata();
  const w = meta.width ?? 512; const h = meta.height ?? 512;
  const out: Array<{ kind: string; bytes: Buffer }> = [];
  out.push({ kind: 'crop-centre-60%', bytes: await s(img).extract({ left: Math.round(w * 0.2), top: Math.round(h * 0.2), width: Math.round(w * 0.6), height: Math.round(h * 0.6) }).jpeg({ quality: 80 }).toBuffer() });
  out.push({ kind: 'rotate-15°', bytes: await s(img).rotate(15, { background: '#dddddd' }).jpeg({ quality: 80 }).toBuffer() });
  out.push({ kind: 'small-on-new-background', bytes: await s(img).resize(Math.round(w * 0.45)).extend({ top: Math.round(h * 0.3), bottom: Math.round(h * 0.3), left: Math.round(w * 0.3), right: Math.round(w * 0.3), background: '#4a6b8a' }).jpeg({ quality: 80 }).toBuffer() });
  out.push({ kind: 'darker-warmer-blurred', bytes: await s(img).modulate({ brightness: 0.75, saturation: 1.2, hue: 12 }).blur(1.5).jpeg({ quality: 70 }).toBuffer() });
  out.push({ kind: 'mirrored-low-res', bytes: await s(img).flop().resize(160).jpeg({ quality: 60 }).toBuffer() });
  return out;
}

/** Images that are not products at all (flat, gradient, noise, stripes), for the «not similar» side. */
async function unrelated(): Promise<Array<{ kind: string; bytes: Buffer }>> {
  const s = sharp();
  const out: Array<{ kind: string; bytes: Buffer }> = [];
  for (const [i, c] of ['#ffffff', '#1d3833', '#c0392b', '#f1c40f'].entries()) out.push({ kind: `flat-${i}`, bytes: await s({ create: { width: 400, height: 400, channels: 3, background: c } }).jpeg().toBuffer() });
  const noise = Buffer.alloc(400 * 400 * 3); for (let i = 0; i < noise.length; i += 1) noise[i] = crypto.randomInt(256);
  out.push({ kind: 'noise', bytes: await s(noise, { raw: { width: 400, height: 400, channels: 3 } }).jpeg().toBuffer() });
  const stripes = Buffer.alloc(400 * 400 * 3); for (let y = 0; y < 400; y += 1) for (let x = 0; x < 400; x += 1) { const v = (Math.floor(x / 20) + Math.floor(y / 20)) % 2 ? 230 : 30; stripes.fill(v, (y * 400 + x) * 3, (y * 400 + x) * 3 + 3); }
  out.push({ kind: 'checkerboard', bytes: await s(stripes, { raw: { width: 400, height: 400, channels: 3 } }).jpeg().toBuffer() });
  const grad = Buffer.alloc(400 * 400 * 3); for (let y = 0; y < 400; y += 1) for (let x = 0; x < 400; x += 1) { const i = (y * 400 + x) * 3; grad[i] = x * 255 / 400; grad[i + 1] = y * 255 / 400; grad[i + 2] = 128; }
  out.push({ kind: 'gradient', bytes: await s(grad, { raw: { width: 400, height: 400, channels: 3 } }).jpeg().toBuffer() });
  return out;
}

/**
 * Quality evaluation, separate from code correctness: for each indexed catalog image, several altered views are
 * searched (their own product should come first) and non-product images are searched (nothing should be similar).
 * Optional: a directory of extra query photos named `<catalog_item_id>__anything.jpg` (a real second photo) or
 * `none__anything.jpg` (unrelated). Prints the distributions and a threshold between them; it proves nothing
 * beyond these images.
 */
export async function runVisualEval(visual: VisualSearchModule, mediaRootOrDir: string, opts: { catalogPath?: string; publishedPath?: string; mediaRoot?: string; limitImages?: number } = {}): Promise<string> {
  const lines: string[] = [];
  const pos: number[] = []; const neg: number[] = []; let top1 = 0; let top3 = 0; let n = 0;
  const rel = (visual as unknown as { options: { catalogPath: string; publishedPath: string; mediaRoot: string } }).options;
  const catalog = loadCatalog(opts.catalogPath ?? rel.catalogPath, opts.publishedPath ?? rel.publishedPath);
  if (!catalog) return 'no catalog';
  const root = opts.mediaRoot ?? rel.mediaRoot;
  const seen = new Set<string>();
  const t0 = Date.now(); let queries = 0;
  for (const e of catalog.entries) {
    for (const img of e.images.slice(0, 1)) {
      if (seen.has(img.sha256) || (opts.limitImages && seen.size >= opts.limitImages)) continue;
      seen.add(img.sha256);
      const bytes = fs.readFileSync(path.join(root, img.path));
      for (const v of await variants(bytes)) {
        const ranked = await visual.evaluate(v.bytes); queries += 1;
        const at = ranked.findIndex((r) => r.catalogItemId === e.catalogItemId);
        n += 1; if (at === 0) top1 += 1; if (at >= 0 && at < 3) top3 += 1;
        if (at >= 0) pos.push(ranked[at].score);
        // The best score of a product from another business group stands for «a different product».
        const other = ranked.find((r) => r.catalogItemId !== e.catalogItemId && catalog.entries.find((x) => x.catalogItemId === r.catalogItemId)?.grouping !== e.grouping);
        if (other) neg.push(other.score);
        if (at !== 0) lines.push(`  miss: «${e.name}» (${v.kind}) → own rank ${at + 1}, top «${ranked[0]?.name}» ${f(ranked[0]?.score ?? NaN)}`);
      }
    }
  }
  const junk: number[] = [];
  for (const u of await unrelated()) { const r = await visual.evaluate(u.bytes); queries += 1; junk.push(r[0]?.score ?? 0); lines.push(`  non-product ${u.kind}: best ${f(r[0]?.score ?? NaN)} «${r[0]?.name ?? ''}»`); }
  if (fs.existsSync(mediaRootOrDir) && fs.statSync(mediaRootOrDir).isDirectory() && mediaRootOrDir !== root) {
    for (const file of fs.readdirSync(mediaRootOrDir).filter((x) => /\.(jpe?g|png|webp)$/i.test(x))) {
      const [expect] = file.split('__');
      const r = await visual.evaluate(fs.readFileSync(path.join(mediaRootOrDir, file))); queries += 1;
      if (expect === 'none') { junk.push(r[0]?.score ?? 0); lines.push(`  extra unrelated ${file}: best ${f(r[0]?.score ?? NaN)} «${r[0]?.name ?? ''}»`); }
      else { const at = r.findIndex((x) => x.catalogItemId === expect); lines.push(`  extra ${file}: own rank ${at + 1} score ${f(at >= 0 ? r[at].score : NaN)}`); if (at >= 0) pos.push(r[at].score); }
    }
  }
  const ms = Date.now() - t0;
  const suggestion = (pct(pos, 0.1) + Math.max(pct(junk, 1), pct(neg, 0.9))) / 2;
  return [
    `visual-eval: ${seen.size} catalog images × 5 altered views = ${n} queries; ${junk.length} non-product queries; ${queries} searches in ${ms} ms (${Math.round(ms / Math.max(1, queries))} ms each, this machine)`,
    `  own product first: ${top1}/${n} (${Math.round(top1 * 100 / Math.max(1, n))}%); in top 3: ${top3}/${n} (${Math.round(top3 * 100 / Math.max(1, n))}%)`,
    `  own-product score: p10 ${f(pct(pos, 0.1))} · median ${f(pct(pos, 0.5))} · min ${f(pct(pos, 0))}`,
    `  best other-group product: median ${f(pct(neg, 0.5))} · p90 ${f(pct(neg, 0.9))} · max ${f(pct(neg, 1))}`,
    `  non-product images: max ${f(pct(junk, 1))} · median ${f(pct(junk, 0.5))}`,
    `  suggested threshold (between own-product p10 and the higher of other-group p90 / non-product max): ${f(suggestion)}`,
    ...lines.slice(0, 60),
  ].join('\n');
}
