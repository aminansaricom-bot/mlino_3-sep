// factory.ts — ساخت Resolver نیت از env (نقطه‌ی تنها برای تصمیم مسیر)
// Edge-first (اصل ۲.۲): بدون کلید API → پارسر قاعده‌محور روی دستگاه.
// الزام ۴: کلید فقط از import.meta.env خوانده می‌شود — هرگز hard-code.
// ⚠️ محدودیت صادقانه: اعمال پلن سمت کلاینت است — UX، نه امنیت.

import { resolvePlanRoute } from '../planRouting';
import { RuleIntentResolver } from './LlmIntentParser';
import type { IntentResolver } from './LlmIntentParser';
import { DeepSeekChatClient, GeminiChatClient } from './LlmClient';

export interface ResolverBuildResult {
  resolver: IntentResolver;
  /** چه چیزی ساخته شد و چرا — برای نوار وضعیت صادقانه UI */
  buildInfo: {
    planId: string;
    engine: string;
    model: string | null;
    /** چرا این مسیر: plan | no-key | unknown-plan */
    reason: 'plan' | 'no-key' | 'unknown-plan';
    fellBackToDefault: boolean;
  };
}

export function buildIntentResolver(planIdRaw: string | null | undefined): ResolverBuildResult {
  const route = resolvePlanRoute(planIdRaw);

  if (route.engine === 'rule-based') {
    return {
      resolver: new RuleIntentResolver(undefined, route.planId),
      buildInfo: {
        planId: route.planId,
        engine: 'rule-based',
        model: null,
        reason: route.fellBackToDefault && planIdRaw ? 'unknown-plan' : 'plan',
        fellBackToDefault: route.fellBackToDefault,
      },
    };
  }

  const deepseekKey = import.meta.env.V2_DEEPSEEK_API_KEY;
  const geminiKey = import.meta.env.V2_GEMINI_API_KEY;

  if (route.engine === 'llm-deepseek') {
    if (typeof deepseekKey !== 'string' || deepseekKey.length === 0) {
      return noKeyFallback(route.planId);
    }
    return {
      resolver: new LlmWithRoute(new DeepSeekChatClient(deepseekKey, route.model ?? undefined), route.planId),
      buildInfo: { planId: route.planId, engine: 'llm-deepseek', model: route.model, reason: 'plan', fellBackToDefault: route.fellBackToDefault },
    };
  }

  // llm-gemini
  if (typeof geminiKey !== 'string' || geminiKey.length === 0) {
    return noKeyFallback(route.planId);
  }
  return {
    resolver: new LlmWithRoute(new GeminiChatClient(geminiKey, route.model ?? undefined), route.planId),
    buildInfo: { planId: route.planId, engine: 'llm-gemini', model: route.model, reason: 'plan', fellBackToDefault: route.fellBackToDefault },
  };
}

function noKeyFallback(planId: string): ResolverBuildResult {
  return {
    resolver: new RuleIntentResolver(undefined, planId),
    buildInfo: {
      planId,
      engine: 'rule-based',
      model: null,
      reason: 'no-key',
      fellBackToDefault: false,
    },
  };
}

/**
 * LlmIntentParser به همراه مسیر پلن — سازنده‌ی فعلی planId را از options
 * می‌گیرد؛ این wrapper فقط آن را از route پر می‌کند تا سیم‌کشی یکجا بماند.
 */
import { LlmIntentParser } from './LlmIntentParser';

class LlmWithRoute extends LlmIntentParser {
  constructor(client: ConstructorParameters<typeof LlmIntentParser>[0]['client'], planId: string) {
    super({ client, planId });
  }
}
