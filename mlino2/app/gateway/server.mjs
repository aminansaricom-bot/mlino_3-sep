// server.mjs — دروازه‌ی دستیار MLINO (Node ≥ 20، بدون وابستگی).
//
// اجرا:  MLINO_ASSISTANT_KEY_FILE=<مسیر فایل کلید بیرون از مخزن> node gateway/server.mjs
// متغیرها: MLINO_ASSISTANT_PORT (پیش‌فرض 8787)، MLINO_ASSISTANT_HOST (پیش‌فرض 127.0.0.1)،
//          MLINO_ASSISTANT_BASE_URL (پیش‌فرض https://codecraftapi.com/v1)، MLINO_ASSISTANT_DAILY_LIMIT (پیش‌فرض 2000)
//
// طبق طرح مصوب ۷.۴ و ۷.۶: متن پرسش، مختصات، هدرهای احراز هویت و پاسخ مدل هرگز
// ثبت نمی‌شوند. فقط زمان، شناسه‌ی تصادفی درخواست، مدل، وضعیت، تأخیر و شمار توکن.

import { createServer } from 'node:http';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createDailyBudget, createLimiter, normalizeQuery, parseKeyFile, resolveIntent } from './assistantCore.mjs';

const keyFile = process.env.MLINO_ASSISTANT_KEY_FILE;
if (!keyFile) { console.error(JSON.stringify({ level: 'fatal', code: 'KEY_FILE_REQUIRED' })); process.exit(1); }
const keys = parseKeyFile(readFileSync(keyFile, 'utf8'));
if (keys.length === 0) { console.error(JSON.stringify({ level: 'fatal', code: 'NO_KEYS' })); process.exit(1); }

const port = Number(process.env.MLINO_ASSISTANT_PORT ?? 8787);
const host = process.env.MLINO_ASSISTANT_HOST ?? '127.0.0.1';
const baseUrl = process.env.MLINO_ASSISTANT_BASE_URL ?? 'https://codecraftapi.com/v1';
const limiter = createLimiter();
const budget = createDailyBudget(Number(process.env.MLINO_ASSISTANT_DAILY_LIMIT ?? 2000));
// نمک روزانه: شناسه‌ی کاربر فقط هش کوتاه‌عمر IP است؛ IP خام نگه‌داری یا ثبت نمی‌شود.
let salt = randomBytes(16);
setInterval(() => { salt = randomBytes(16); }, 24 * 3600 * 1000).unref();
const clientId = (req) => createHash('sha256').update(salt).update(String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '')).digest('hex').slice(0, 16);

const log = (entry) => console.log(JSON.stringify({ t: new Date().toISOString(), ...entry }));
const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  const requestId = randomUUID();
  if (req.url === '/assistant/health' && req.method === 'GET') return send(res, 200, { ok: true });
  if (req.url !== '/assistant/intent') return send(res, 404, { error: 'not_found' });
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) return send(res, 415, { error: 'json_required' });

  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > 4096) return send(res, 413, { error: 'too_large' }); chunks.push(chunk); }
  let payload; try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(res, 400, { error: 'bad_json' }); }
  if (!payload || typeof payload !== 'object' || Object.keys(payload).some((key) => key !== 'query')) return send(res, 400, { error: 'bad_request' });
  const query = normalizeQuery(payload.query);
  if (!query) return send(res, 400, { error: 'bad_query' });

  const client = clientId(req);
  const slot = limiter.acquire(client);
  if (slot !== 'ok') { log({ id: requestId, status: 429, outcome: slot }); return send(res, 429, { error: 'rate_limited' }); }
  try {
    if (!budget.take()) { log({ id: requestId, status: 503, outcome: 'daily_budget' }); return send(res, 503, { error: 'budget_exhausted' }); }
    const result = await resolveIntent(query, { fetchImpl: fetch, keys, baseUrl });
    if (!result.ok) { log({ id: requestId, status: 502, error: result.error }); return send(res, 502, { error: result.error }); }
    log({ id: requestId, status: 200, model: result.model, latency_ms: result.latencyMs, tokens_in: result.tokens.in, tokens_out: result.tokens.out });
    return send(res, 200, { intent: { action: result.intent.action, keywords: result.intent.keywords, category: result.intent.category, open_now: result.intent.open_now, radius_meters: result.intent.radius_meters, sort: result.intent.sort }, answer: result.intent.answer, route: { task: 'intent', model: result.model } });
  } finally { limiter.release(client); }
}).listen(port, host, () => log({ level: 'info', code: 'LISTENING', host, port, keys: keys.length }));
