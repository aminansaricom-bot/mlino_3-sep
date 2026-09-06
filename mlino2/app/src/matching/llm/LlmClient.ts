// LlmClient.ts — لایه‌ی فراخوانی سرویس‌های LLM مصوب (DeepSeek و Gemini Flash)
// الزام ۴ دستور LLM: کلید فقط از env به سازنده تزریق می‌شود — هرگز در ریپو/کد.
// الزام ۳ (حریم خصوصی): این لایه فقط systemPrompt ثابت + جمله‌ی کاربر می‌فرستد —
// بدون شناسه، بدون موقعیت، بدون تاریخچه‌ی چت.
// الزام ۵ (تست بدون شبکه‌ی واقعی): همه‌چیز از طریق fetch تزریق‌شدنی/Stub شدنی است.

export interface LlmChatRequest {
  /** دستور ثابت سیستم — بدون داده‌ی کاربر */
  systemPrompt: string;
  /** فقط جمله‌ی کاربر — هیچ چیز دیگری از دستگاه خارج نمی‌شود */
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmChatClient {
  /** شناسه‌ی سرویس — در پاسخ ثبت می‌شود تا مسیر نتیجه مشخص باشد (الزام ۲) */
  readonly serviceId: 'deepseek' | 'gemini';
  /** نام مدل (مثلاً deepseek-chat) */
  readonly model: string;
  complete(request: LlmChatRequest, signal?: AbortSignal): Promise<string>;
}

export class LlmClientError extends Error {
  constructor(
    message: string,
    readonly serviceId: string,
    readonly causeKind: 'http' | 'bad-response' | 'network',
  ) {
    super(`[${serviceId}] ${message}`);
    this.name = 'LlmClientError';
  }
}

async function postJson(
  serviceId: string,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    // شبکه/لغو — هر دو از دید تماس‌گیرنده «شکست قابل fallback» هستند
    throw new LlmClientError(
      err instanceof Error ? err.message : 'network failure',
      serviceId,
      'network',
    );
  }
  if (!response.ok) {
    throw new LlmClientError(`HTTP ${response.status}`, serviceId, 'http');
  }
  try {
    return await response.json();
  } catch {
    throw new LlmClientError('response is not JSON', serviceId, 'bad-response');
  }
}

function readText(data: unknown, pick: (d: Record<string, unknown>) => unknown): string {
  const text = pick(data as Record<string, unknown>);
  if (typeof text !== 'string' || text.length === 0) {
    throw new LlmClientError('empty/invalid completion', 'unknown', 'bad-response');
  }
  return text;
}

/**
 * DeepSeek — API سازگار با OpenAI Chat Completions.
 * کلید فقط در هدر Authorization (نه در URL — URL ممکن است در لاگ بماند).
 */
export class DeepSeekChatClient implements LlmChatClient {
  readonly serviceId = 'deepseek' as const;
  constructor(
    private readonly apiKey: string,
    readonly model: string = 'deepseek-chat',
    private readonly baseUrl: string = 'https://api.deepseek.com',
  ) {}

  async complete(request: LlmChatRequest, signal?: AbortSignal): Promise<string> {
    const data = await postJson(
      this.serviceId,
      `${this.baseUrl}/chat/completions`,
      { Authorization: `Bearer ${this.apiKey}` },
      {
        model: this.model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
        temperature: request.temperature ?? 0,
        max_tokens: request.maxTokens ?? 256,
        stream: false,
      },
      signal,
    );
    return readText(data, (d) => {
      const choices = d['choices'];
      if (!Array.isArray(choices) || choices.length === 0) return undefined;
      const first = choices[0];
      if (typeof first !== 'object' || first === null) return undefined;
      const message = (first as Record<string, unknown>)['message'];
      if (typeof message !== 'object' || message === null) return undefined;
      return (message as Record<string, unknown>)['content'];
    });
  }
}

/**
 * Gemini Flash — GenerateContent API.
 * کلید فقط در هدر x-goog-api-key (نه در query — URL ممکن است در لاگ بماند).
 */
export class GeminiChatClient implements LlmChatClient {
  readonly serviceId = 'gemini' as const;
  constructor(
    private readonly apiKey: string,
    readonly model: string = 'gemini-2.0-flash',
    private readonly baseUrl: string = 'https://generativelanguage.googleapis.com',
  ) {}

  async complete(request: LlmChatRequest, signal?: AbortSignal): Promise<string> {
    const data = await postJson(
      this.serviceId,
      `${this.baseUrl}/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
      { 'x-goog-api-key': this.apiKey },
      {
        systemInstruction: { parts: [{ text: request.systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: request.userPrompt }] }],
        generationConfig: {
          temperature: request.temperature ?? 0,
          maxOutputTokens: request.maxTokens ?? 256,
        },
      },
      signal,
    );
    return readText(data, (d) => {
      const candidates = d['candidates'];
      if (!Array.isArray(candidates) || candidates.length === 0) return undefined;
      const first = candidates[0];
      if (typeof first !== 'object' || first === null) return undefined;
      const content = (first as Record<string, unknown>)['content'];
      if (typeof content !== 'object' || content === null) return undefined;
      const parts = (content as Record<string, unknown>)['parts'];
      if (!Array.isArray(parts) || parts.length === 0) return undefined;
      const firstPart = parts[0];
      if (typeof firstPart !== 'object' || firstPart === null) return undefined;
      return (firstPart as Record<string, unknown>)['text'];
    });
  }
}
