import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const paths = JSON.parse(fs.readFileSync(path.join(root, 'src/design/icon-paths.json'), 'utf8'));
const out = path.join(root, 'public/mlino-assets');
fs.mkdirSync(out, {recursive: true});
const svg = (name, d) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><title>MLINO ${name}</title><path d="${d}"/></svg>`;
for (const [name, d] of Object.entries(paths)) fs.writeFileSync(path.join(out, `${name}.svg`), svg(name, d));
const categories = [['dental','دندان‌پزشکی','#3b9ee8'],['beauty','زیبایی','#c65bb0'],['cafe','کافه','#b9782a'],['restaurant','غذا','#dc6644'],['shop','خرید','#4aaf78']];
const cards = categories.map(([icon,label,color]) => `<article><div class="coin" style="--c:${color}"><img src="${icon}.svg" alt=""/></div><b>${label}</b><small>نشان دسته</small></article>`).join('');
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>MLINO asset pack</title><style>body{margin:0;padding:32px;background:#0b1220;color:#fff;font-family:system-ui;direction:rtl}h1{color:#78a6ff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:16px;max-width:760px}article{padding:20px;text-align:center;background:#111a2e;border-radius:22px}.coin{margin:auto auto 12px;display:grid;place-items:center;width:64px;height:64px;border-radius:50%;background:linear-gradient(145deg,#fff,var(--c));box-shadow:0 8px 24px #0005}.coin img{width:32px;color:#fff;filter:brightness(0) invert(1)}small{display:block;opacity:.6;margin-top:6px}</style><h1>MLINO / Asset Pack</h1><p>نشان‌های دسته و فرمان‌های رابط. این‌ها لوگوی واقعی کسب‌وکار نیستند.</p><div class="grid">${cards}</div>`);
