// llm.test.ts — تست‌های الزامات دستور LLM (الزام ۵: بدون شبکه‌ی واقعی)
// ۱) قرارداد مشترک: هر دو پیاده‌سازی (قاعده‌محور و LLM با Mock API) با یک
//    قرارداد یکسان سنجیده می‌شوند.
// ۲) fallback قطعی در خطا/timeout/بدشکل/دسته‌ی نامعتبر.
// ۳) حریم خصوصی: فقط جمله‌ی کاربر خارج می‌شود؛ کلید فقط در هدر.
// ۴) Edge-first: جواب کافیِ قاعده‌محور → هیچ فراخوانی شبکه‌ای.
// ۵) ضدتوهم ساختاری: نیت خروجی LLM هم به دایرکتوری واقعی می‌رسد، نه اختراع.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { RuleIntentResolver, LlmIntentParser, extractJsonPayload } from './LlmIntentParser';
import type { IntentResolver } from './LlmIntentParser';
import { DeepSeekChatClient, GeminiChatClient, LlmClientError } from './LlmClient';
import type { LlmChatRequest } from './LlmClient';
import { resolvePlanRoute, PLAN_ROUTES } from '../planRouting';
import { validateParsedIntent } from '../intentContract';
import { MatchingService } from '../MatchingService';
import { BusinessDirectoryService } from '../../directory/BusinessDirectoryService';
import { loadMockSnapshotRaw } from '../../directory/loader';

const VALID_LLM_JSON = JSON.stringify({
  category: 'cafe',
  keywords: ['قهوه', 'داغ'],
  modifiers: { wantsOffer: false, wantsCheap: false, wantsNearest: true },
});

function fakeClient(content: string | 'throw', serviceId: 'deepseek' | 'gemini' = 'deepseek'): {
  client: import('./LlmClient').LlmChatClient;
  requests: LlmChatRequest[];
} {
  const requests: LlmChatRequest[] = [];
  return {
    requests,
    client: {
      serviceId,
      model: serviceId === 'deepseek' ? 'deepseek-chat' : 'gemini-2.0-flash',
      async complete(request: LlmChatRequest) {
        requests.push(request);
        if (content === 'throw') throw new LlmClientError('boom', serviceId, 'http');
        return { text: content, usage: { promptTokens: 10, completionTokens: 5 } };
      },
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('قرارداد مشترک — هر دو پیاده‌سازی (الزام ۵)', () => {
  const CASES: Array<{ utterance: string; name: string }> = [
    { name: 'نیت دندان مشخص', utterance: 'دنبال جرمگیری دندان می‌گردم' },
    { name: 'نیت نامطمئن', utterance: 'سلام خسته نباشید' },
    { name: 'جمله‌ی خالی', utterance: '' },
    { name: 'تخفیف + نزدیکی', utterance: 'لیزر ارزان نزدیک اینجا' },
  ];

  async function runContract(resolver: IntentResolver): Promise<void> {
    for (const c of CASES) {
      const res = await resolver.resolve(c.utterance);
      const validated = validateParsedIntent({
        category: res.category,
        keywords: res.keywords,
        modifiers: res.modifiers,
      });
      expect(validated.ok, `${c.name}: ${validated.ok ? '' : validated.reason}`).toBe(true);
      expect(res.source).toMatch(/^(rule-based|llm)$/);
      expect(typeof res.engineModel).toBe('string');
      expect(res.engineModel.length).toBeGreaterThan(0);
      expect(typeof res.planId).toBe('string');
      expect(typeof res.fellBackToRule).toBe('boolean');
    }
  }

  it('قاعده‌محور از قرارداد می‌گذرد', async () => {
    await runContract(new RuleIntentResolver());
  });

  it('LLM (با Mock API) از همان قرارداد می‌گذرد', async () => {
    const { client } = fakeClient(VALID_LLM_JSON);
    await runContract(new LlmIntentParser({ client, timeoutMs: 50 }));
  });

  it('تعیین‌کنندگی مسیر قاعده‌محور: همان ورودی، همان خروجی', async () => {
    const r = new RuleIntentResolver();
    expect(await r.resolve('کاپوچینو میخوام')).toEqual(await r.resolve('کاپوچینو میخوام'));
  });
});

describe('LlmIntentParser — Edge-first و fallback (الزام ۲)', () => {
  it('جواب کافیِ قاعده‌محور → LLM هرگز فراخوانی نمی‌شود (بدون شبکه)', async () => {
    const { client, requests } = fakeClient(VALID_LLM_JSON);
    const parser = new LlmIntentParser({ client, timeoutMs: 50 });
    const res = await parser.resolve('دنبال جرمگیری دندان می‌گردم');
    expect(res.source).toBe('rule-based');
    expect(res.category).toBe('dental_clinic');
    expect(requests.length).toBe(0);
  });

  it('نیت نامطمئن → LLM صدا زده می‌شود و جواب معتبرش پذیرفته می‌شود', async () => {
    const { client, requests } = fakeClient(VALID_LLM_JSON);
    const parser = new LlmIntentParser({ client, timeoutMs: 50 });
    const res = await parser.resolve('سلام خسته نباشید');
    expect(res.source).toBe('llm');
    expect(res.engineModel).toBe('deepseek:deepseek-chat');
    expect(res.category).toBe('cafe');
    expect(requests.length).toBe(1);
  });

  it('پاسخ بدشکل (غیر JSON) → fallback قطعی قاعده‌محور با fellBackToRule', async () => {
    const { client } = fakeClient('این یک پاسخ متنی است نه JSON');
    const parser = new LlmIntentParser({ client, timeoutMs: 50 });
    const res = await parser.resolve('سلام خسته نباشید');
    expect(res.source).toBe('rule-based');
    expect(res.fellBackToRule).toBe(true);
  });

  it('دسته‌ی خارج از whitelist (توهم) → رد و fallback (الزام ۱)', async () => {
    const hallucinated = JSON.stringify({
      category: 'pizza_place',
      keywords: ['پیتزا'],
      modifiers: {},
    });
    const { client } = fakeClient(hallucinated);
    const parser = new LlmIntentParser({ client, timeoutMs: 50 });
    const res = await parser.resolve('سلام خسته نباشید');
    expect(res.category).not.toBe('pizza_place');
    expect(res.source).toBe('rule-based');
    expect(res.fellBackToRule).toBe(true);
  });

  it('خطای سرویس (HTTP/network) → fallback قطعی', async () => {
    const { client } = fakeClient('throw');
    const parser = new LlmIntentParser({ client, timeoutMs: 50 });
    const res = await parser.resolve('سلام خسته نباشید');
    expect(res.source).toBe('rule-based');
    expect(res.fellBackToRule).toBe(true);
  });

  it('Timeout → fallback قطعی (AbortSignal واقعی)', async () => {
    const client: import('./LlmClient').LlmChatClient = {
      serviceId: 'gemini',
      model: 'gemini-2.0-flash',
      complete: (_req, signal) =>
        new Promise((_, reject) => {
          signal?.addEventListener('abort', () =>
            reject(new LlmClientError('aborted', 'gemini', 'network')),
          );
        }),
    };
    const parser = new LlmIntentParser({ client, timeoutMs: 20 });
    const res = await parser.resolve('سلام خسته نباشید');
    expect(res.source).toBe('rule-based');
    expect(res.fellBackToRule).toBe(true);
    expect(parser.usage).toBeNull();
  });

  it('code fence در پاسخ مدل پذیرفته می‌شود (تاب‌آوری JSON)', async () => {
    const fenced = '```json\n' + VALID_LLM_JSON + '\n```';
    const { client } = fakeClient(fenced);
    const parser = new LlmIntentParser({ client, timeoutMs: 50 });
    const res = await parser.resolve('سلام خسته نباشید');
    expect(res.source).toBe('llm');
    expect(res.category).toBe('cafe');
  });

  it('extractJsonPayload: بدنه‌ی فنس‌دار و خام را درست می‌خواند و حدس نمی‌زند', () => {
    expect(extractJsonPayload(VALID_LLM_JSON)).toEqual(JSON.parse(VALID_LLM_JSON));
    expect(extractJsonPayload('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(() => extractJsonPayload('nope')).toThrow();
  });
});

describe('حریم خصوصی (الزام ۳) — فقط جمله‌ی کاربر خارج می‌شود', () => {
  it('فقط userPrompt = جمله‌ی کاربر؛ هیچ شناسه/موقعیت/تاریخچه‌ای نیست', async () => {
    // جمله‌ای که قاعده‌محور نامطمئن است → LLM صدا زده می‌شود (مسیر واقعی حریم خصوصی)
    const { client, requests } = fakeClient(VALID_LLM_JSON);
    const parser = new LlmIntentParser({ client, timeoutMs: 50 });
    await parser.resolve('یه جای دنج برای afternoon tea می‌خوام');
    expect(requests.length).toBe(1);
    expect(requests[0]?.userPrompt).toBe('یه جای دنج برای afternoon tea می‌خوام');
    const sp = requests[0]?.systemPrompt ?? '';
    // systemPrompt ثابت است — هیچ داده‌ای از کاربر در آن نیست
    expect(sp).not.toContain('دنج');
    expect(sp).not.toContain('afternoon');
  });
});

describe('آداپتورهای سرویس — شکل درخواست و جای کلید (الزام ۴)', () => {
  function stubFetchCapture(): { body: unknown; headers: Record<string, string>; url: string; json: unknown } {
    const captured: { body: unknown; headers: Record<string, string>; url: string; json: unknown } = {
      body: null,
      headers: {},
      url: '',
      json: null,
    };
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      captured.url = String(_url);
      const h = new Headers(init?.headers);
      captured.headers = { authorization: h.get('authorization') ?? '', goog: h.get('x-goog-api-key') ?? '' };
      captured.body = JSON.parse(String(init?.body));
      captured.json =
        captured.url.includes('deepseek')
          ? {
              choices: [{ message: { content: VALID_LLM_JSON } }],
              usage: { prompt_tokens: 120, completion_tokens: 30 },
            }
          : {
              candidates: [{ content: { parts: [{ text: VALID_LLM_JSON }] } }],
              usageMetadata: { promptTokenCount: 130, candidatesTokenCount: 28 },
            };
      return new Response(JSON.stringify(captured.json), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    return captured;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('DeepSeek: کلید فقط در هدر Bearer، URL بدون کلید، پیام system/user جدا', async () => {
    const cap = stubFetchCapture();
    const c = new DeepSeekChatClient('sk-test-key-123');
    const res = await c.complete({ systemPrompt: 'SYS', userPrompt: 'USER-TEXT' });
    expect(res.text).toBe(VALID_LLM_JSON);
    expect(res.usage).toEqual({ promptTokens: 120, completionTokens: 30 });
    expect(cap.headers.authorization).toBe('Bearer sk-test-key-123');
    expect(cap.url).not.toContain('sk-test-key-123');
    expect(cap.url).toContain('api.deepseek.com');
    const body = cap.body as Record<string, unknown>;
    expect(body['model']).toBe('deepseek-chat');
    const messages = body['messages'] as Array<Record<string, string>>;
    expect(messages[0]?.['role']).toBe('system');
    expect(messages[0]?.['content']).toBe('SYS');
    expect(messages[1]?.['content']).toBe('USER-TEXT');
  });

  it('Gemini: کلید فقط در هدر x-goog-api-key، URL بدون کلید', async () => {
    const cap = stubFetchCapture();
    const c = new GeminiChatClient('gm-test-key-456');
    const res = await c.complete({ systemPrompt: 'SYS', userPrompt: 'USER-TEXT' });
    expect(res.text).toBe(VALID_LLM_JSON);
    expect(res.usage).toEqual({ promptTokens: 130, completionTokens: 28 });
    expect(cap.headers.goog).toBe('gm-test-key-456');
    expect(cap.url).not.toContain('gm-test-key-456');
    expect(cap.url).toContain('generativelanguage.googleapis.com');
    expect(cap.url).toContain('gemini-2.0-flash');
  });

  it('HTTP 401 → LlmClientError (قابل fallback، بدون retry خاموش)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('unauthorized', { status: 401 })),
    );
    const c = new DeepSeekChatClient('bad-key');
    await expect(c.complete({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrowError(
      LlmClientError,
    );
  });
});

describe('planRouting — config محور، بدون پلن جعلی (اصل ۲.۱)', () => {
  it('پلن شناخته‌شده → مسیر همان پلن (Gemini = پیش‌فرض LLM طبق تقسیم کار مصوب)', () => {
    const r = resolvePlanRoute('plan_mock_pro');
    expect(r.engine).toBe('llm-gemini');
    expect(r.model).toBe('gemini-2.0-flash');
    expect(r.fellBackToDefault).toBe(false);
    const max = resolvePlanRoute('plan_mock_max');
    expect(max.engine).toBe('llm-deepseek'); // DeepSeek = رزرو تحلیلی
  });

  it('پلن ناشناخته/غایب → پلن پایه‌ی قاعده‌محور (بدون حدس)', () => {
    expect(resolvePlanRoute('plan_fake_enterprise').engine).toBe('rule-based');
    expect(resolvePlanRoute(null).engine).toBe('rule-based');
    expect(resolvePlanRoute(undefined).fellBackToDefault).toBe(false);
  });

  it('جدول پلن‌ها داده‌ی آزمایشی برچسب‌خورده است — ساختار واقعی از مالک نیامده', () => {
    expect(Object.keys(PLAN_ROUTES).every((k) => k.includes('mock'))).toBe(true);
  });
});

describe('ضدتوهم ساختاری با نیت LLM (الزام ۱) — نتیجه از دایرکتوری واقعی', () => {
  it('نیتِ تولیدی LLM وارد MatchingService شود → نتایج قابل‌ردیابی به رکورد واقعی', async () => {
    const directory = new BusinessDirectoryService();
    directory.loadSnapshot(await loadMockSnapshotRaw());
    const matching = new MatchingService(directory);
    const { client } = fakeClient(VALID_LLM_JSON);
    const parser = new LlmIntentParser({ client, timeoutMs: 50 });
    const res = await parser.resolve('سلام خسته نباشید');
    const match = matching.match(
      { category: res.category, keywords: res.keywords, modifiers: res.modifiers },
      { latitude: 35.7603, longitude: 51.41, radiusMeters: 5000 },
    );
    const allIds = new Set(directory.getAll().map((r) => r.business_id));
    for (const item of match.items) {
      expect(allIds.has(item.record.business_id)).toBe(true);
    }
  });
});
