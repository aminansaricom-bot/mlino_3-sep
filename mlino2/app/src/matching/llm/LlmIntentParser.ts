// LlmIntentParser.ts — موتور intent مبتنی بر LLM با fallback قطعی قاعده‌محور
// الزام ۲ دستور LLM: هر خطا/Timeout/پاسخ بدشکل → برگشت قطعی به پارسر
// قاعده‌محور؛ و مسیر نتیجه (source + model + plan) همیشه ثبت می‌شود.
// الزام ۱: خروجی LLM پیش از پذیرش از validateParsedIntent (قرارداد مشترک)
// عبور می‌کند — LLM فقط «پارامتر جست‌وجو» تولید می‌کند و نتیجه‌ی نهایی
// همیشه از دایرکتوری واقعی می‌آید (MatchingService بدون تغییر).
//
// Edge-first (اصل ۲.۲): resolveLlm فقط وقتی صدا زده می‌شود که پلن ایجاب کند
// یا پارسر قاعده‌محور «کافی» نبود (دسته null). وابستگی‌ها تزریق‌شدنی‌اند تا
// تست‌ها بدون شبکه‌ی واقعی کار کنند (الزام ۵).

import type { ParsedIntent } from '../IntentParser';
import { RuleBasedIntentParser } from '../IntentParser';
import { validateParsedIntent } from '../intentContract';
import type { LlmChatClient } from './LlmClient';

export interface IntentResolution extends ParsedIntent {
  /** مسیری که جواب نهایی از آن آمد — برای شفافیت UI/گزارش */
  source: 'rule-based' | 'llm';
  /** شناسه‌ی مدل: rule-based:v1 یا مثلاً deepseek:deepseek-chat */
  engineModel: string;
  /** پلنی که طبق config اعمال شد */
  planId: string;
  /** true اگر LLM شکست خورد و به قاعده‌محور برگشتیم (برای شفافیت UI) */
  fellBackToRule: boolean;
}

export interface IntentResolver {
  resolve(utterance: string): Promise<IntentResolution>;
}

/** پارسر قاعده‌محور به‌صورت Resolver — پلن پایه‌ی Edge-first */
export class RuleIntentResolver implements IntentResolver {
  constructor(
    private readonly ruleParser: RuleBasedIntentParser = new RuleBasedIntentParser(),
    private readonly planId: string = 'plan_mock_free',
  ) {}

  async resolve(utterance: string): Promise<IntentResolution> {
    const intent = this.ruleParser.parse(utterance);
    return { ...intent, source: 'rule-based', engineModel: 'rule-based:v1', planId: this.planId, fellBackToRule: false };
  }
}

/** استخراج JSON از پاسخ متنی مدل — تاب‌آور به code fence، بدون حدس */
export function extractJsonPayload(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced !== null ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    throw new Error('model response is not valid JSON');
  }
}

export interface LlmIntentParserOptions {
  client: LlmChatClient;
  ruleParser?: RuleBasedIntentParser;
  planId?: string;
  /** حداکثر انتظار برای پاسخ LLM (ms) — بعدش fallback قطعی */
  timeoutMs?: number;
  /** تزریق fetch برای تست — پیش‌فرض globalThis.fetch */
  fetchImpl?: typeof fetch;
}

export class LlmIntentParser implements IntentResolver {
  private readonly ruleParser: RuleBasedIntentParser;
  private readonly planId: string;
  private readonly timeoutMs: number;
  private lastUsage: { promptTokens: number; completionTokens: number } | null = null;

  constructor(private readonly options: LlmIntentParserOptions) {
    this.ruleParser = options.ruleParser ?? new RuleBasedIntentParser();
    this.planId = options.planId ?? 'plan_mock_free';
    this.timeoutMs = options.timeoutMs ?? 8000;
    if (options.fetchImpl !== undefined) {
      globalThis.fetch = options.fetchImpl;
    }
  }

  get engineModel(): string {
    return `${this.options.client.serviceId}:${this.options.client.model}`;
  }

  async resolve(utterance: string): Promise<IntentResolution> {
    // Edge-first: جواب قاعده‌محورِ «کافی» (دسته‌ی مشخص) همان پاسخ نهایی است —
    // هیچ فراخوانی شبکه‌ای انجام نمی‌شود.
    const ruleIntent = this.ruleParser.parse(utterance);
    if (ruleIntent.category !== null) {
      return {
        ...ruleIntent,
        source: 'rule-based',
        engineModel: 'rule-based:v1',
        planId: this.planId,
        fellBackToRule: false,
      };
    }

    try {
      const llmIntent = await this.resolveLlm(utterance);
      return { ...llmIntent, source: 'llm', engineModel: this.engineModel, planId: this.planId, fellBackToRule: false };
    } catch {
      // الزام ۲: هر شکست (خطا/timeout/بدشکل/رد اعتبارسنجی) → قاعده‌محور
      return {
        ...ruleIntent,
        source: 'rule-based',
        engineModel: 'rule-based:v1',
        planId: this.planId,
        fellBackToRule: true,
      };
    }
  }

  private async resolveLlm(utterance: string): Promise<ParsedIntent> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const completion = await this.options.client.complete(
        {
          systemPrompt: INTENT_SYSTEM_PROMPT,
          // حریم خصوصی (الزام ۳): فقط همین جمله — بدون شناسه/موقعیت/تاریخچه
          userPrompt: utterance,
          temperature: 0,
          maxTokens: 256,
        },
        controller.signal,
      );
      this.lastUsage = completion.usage;
      const validated = validateParsedIntent(extractJsonPayload(completion.text));
      if (!validated.ok) throw new Error(`llm intent rejected: ${validated.reason}`);
      return validated.intent;
    } finally {
      clearTimeout(timer);
    }
  }

  /** مصرف توکن آخرین فراخوانی موفق LLM — null یعنی LLM صدا نشد یا شکست خورد */
  get usage(): { promptTokens: number; completionTokens: number } | null {
    return this.lastUsage ?? null;
  }
}

const CATEGORY_LIST = ['dental_clinic', 'beauty_clinic', 'cafe', 'restaurant', 'retail_shop'];

const INTENT_SYSTEM_PROMPT = `تو یک پارسر نیتِ فارسی برای اپلیکیشن فروشگاهی هستی.
وظیفه‌ات فقط استخراج پارامتر جست‌وجو از جمله‌ی کاربر است — هیچ کسب‌وکار، محصول یا قیمتی از خودت نساز.
خروجی باید فقط و فقط این JSON باشد (بدون هیچ متن دیگر):
{"category": "dental_clinic" | "beauty_clinic" | "cafe" | "restaurant" | "retail_shop" | null,
 "keywords": ["..."],
 "modifiers": {"wantsOffer": true|false, "wantsCheap": true|false, "wantsNearest": true|false}}
قواعد:
- category فقط یکی از این‌ها یا null: ${CATEGORY_LIST.join(' | ')}
- اگر مطمئن نیستی category=null بگذار — هرگز حدس نزن.
- keywords فقط واژه‌های کلیدی خودِ جمله‌ی کاربر (حداکثر ۸ مورد).
- تخفیف/آفر/حراج → wantsOffer، ارزان → wantsCheap، نزدیک‌ترین → wantsNearest.`;
