// voice.ts — ورودی و خروجی صوتی با امکانات خود مرورگر.
// سرویس هوش مصنوعی مالک مدل صوتی ندارد (فقط chat و embeddings)؛ پس گفتار به متن با
// SpeechRecognition مرورگر انجام می‌شود. در کروم، صدا برای تبدیل به سرویس گفتار گوگل
// می‌رود و این در متن رضایت صریح گفته می‌شود. پاسخ صوتی فقط اگر صدای فارسی نصب باشد.

import { useCallback, useEffect, useRef, useState } from 'react';
import { SPEECH, callNative, inApp, onNative } from '../native/bridge';
import { tr, speechLang } from '../i18n';

type RecognitionLike = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type RecognitionCtor = new () => RecognitionLike;

/**
 * Inside the Android app the web view has no working speech API; the app's MlinoSpeech plugin (the phone's own
 * recogniser) is wrapped in the same shape, so everything above it stays the same.
 */
class NativeRecognition implements RecognitionLike {
  lang = speechLang(); interimResults = true; continuous = false; maxAlternatives = 1;
  onresult: RecognitionLike['onresult'] = null;
  onerror: RecognitionLike['onerror'] = null;
  onend: RecognitionLike['onend'] = null;
  private off: Array<() => void> = [];
  private ended = false;
  private emit(text: string, isFinal: boolean) {
    const item = Object.assign([{ transcript: text }], { isFinal });
    this.onresult?.({ results: [item] });
  }
  private finish() {
    if (this.ended) return;
    this.ended = true;
    this.off.forEach((f) => f()); this.off = [];
    this.onend?.();
  }
  start(): void {
    this.off.push(onNative(SPEECH, 'partial', (d) => this.emit(String((d as { text?: string }).text ?? ''), false)));
    this.off.push(onNative(SPEECH, 'result', (d) => this.emit(String((d as { text?: string }).text ?? ''), true)));
    this.off.push(onNative(SPEECH, 'error', (d) => this.onerror?.({ error: String((d as { error?: string }).error ?? 'service-not-allowed') })));
    this.off.push(onNative(SPEECH, 'end', () => this.finish()));
    callNative(SPEECH, 'start', { lang: this.lang, interimResults: this.interimResults })
      .catch((e: unknown) => { this.onerror?.({ error: e instanceof Error && e.message ? e.message : 'not-allowed' }); this.finish(); });
  }
  stop(): void { void callNative(SPEECH, 'stop').catch(() => undefined); }
  abort(): void { void callNative(SPEECH, 'abort').catch(() => undefined); this.finish(); }
}

export function recognitionCtor(scope: unknown = globalThis): RecognitionCtor | null {
  if (scope === globalThis && inApp()) return NativeRecognition;
  const g = scope as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return g.SpeechRecognition ?? g.webkitSpeechRecognition ?? null;
}

/** پیام فارسی برای خطاهای رایج تشخیص گفتار. */
export function voiceErrorMessage(code: string): string {
  if (code === 'not-allowed' || code === 'service-not-allowed') return tr('اجازه‌ی میکروفون داده نشد.');
  if (code === 'no-speech') return tr('صدایی شنیده نشد؛ دوباره امتحان کن.');
  if (code === 'network') return tr('تبدیل صدا به متن به اینترنت نیاز دارد.');
  if (code === 'language-not-supported') return tr('تشخیص گفتار فارسی روی این مرورگر در دسترس نیست.');
  return tr('تشخیص گفتار انجام نشد.');
}

export function useVoiceInput(onInterim: (text: string) => void, onFinal: (text: string) => void) {
  const Ctor = recognitionCtor();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<RecognitionLike | null>(null);
  const finalText = useRef('');
  useEffect(() => () => rec.current?.abort(), []);
  const start = useCallback(() => {
    if (!Ctor || listening) return;
    setError(null);
    finalText.current = '';
    const r = new Ctor();
    r.lang = speechLang(); r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    r.onresult = (event) => {
      let text = '';
      let done = false;
      for (let i = 0; i < event.results.length; i += 1) { text += event.results[i][0].transcript; if (event.results[i].isFinal) done = true; }
      onInterim(text);
      if (done) finalText.current = text;
    };
    r.onerror = (event) => { if (event.error !== 'aborted') setError(voiceErrorMessage(event.error)); };
    r.onend = () => { setListening(false); rec.current = null; if (finalText.current.trim()) onFinal(finalText.current.trim()); };
    rec.current = r;
    try { r.start(); setListening(true); } catch { setError(tr('تشخیص گفتار شروع نشد.')); }
  }, [Ctor, listening, onFinal, onInterim]);
  const stop = useCallback(() => rec.current?.stop(), []);
  return { supported: Ctor !== null, listening, error, start, stop };
}

/** خواندن پاسخ با صدای فارسی نصب‌شده روی گوشی؛ اگر نبود، بی‌صدا چیزی خوانده نمی‌شود. */
export function speakPersian(text: string): boolean {
  const synth = (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return false;
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('fa'));
  if (!voice) return false;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = 1;
  synth.speak(utterance);
  return true;
}
