// voice.ts — same module as V2 (mlino2/app/src/assistant/voice.ts): speech-to-text with the browser's own
// SpeechRecognition (in Chrome the audio goes to Google's speech service, which the consent card says). The command is
// understood locally. Spoken replies only if a Persian voice is installed on the device.

import { useCallback, useEffect, useRef, useState } from 'react';

type RecognitionLike = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type RecognitionCtor = new () => RecognitionLike;

export function recognitionCtor(scope: unknown = globalThis): RecognitionCtor | null {
  const g = scope as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return g.SpeechRecognition ?? g.webkitSpeechRecognition ?? null;
}

/** پیام فارسی برای خطاهای رایج تشخیص گفتار. */
export function voiceErrorMessage(code: string): string {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'اجازه‌ی میکروفون داده نشد.';
  if (code === 'no-speech') return 'صدایی شنیده نشد؛ دوباره امتحان کن.';
  if (code === 'network') return 'تبدیل صدا به متن به اینترنت نیاز دارد.';
  if (code === 'language-not-supported') return 'تشخیص گفتار فارسی روی این مرورگر در دسترس نیست.';
  return 'تشخیص گفتار انجام نشد.';
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
    r.lang = 'fa-IR'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
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
    try { r.start(); setListening(true); } catch { setError('تشخیص گفتار شروع نشد.'); }
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
