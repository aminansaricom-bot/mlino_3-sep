import { describe, expect, it } from 'vitest';
import { foundationReducer, foundationExperience, initialFoundation, IDLE_LIMIT_MS, SESSION_LIMIT_MS } from './foundation';
import type { FoundationState, FoundationCommand } from './foundation';
import { intentStatus, MAX_INTENT_LENGTH } from './intent';
import type { IntentAction, IntentToken } from './intent';
import { bindFoundationEnvironment } from './foundationEnvironment';

const lifecycle = (state: FoundationState, command: FoundationCommand, now = 100, foreground = true, permitted = true) =>
  foundationReducer(state, { command, now, foreground, permitted });
const active = () => lifecycle(lifecycle(initialFoundation(), 'start', 0), 'accept', 1);
const token = (state: FoundationState): IntentToken => ({ generation: state.generation, revision: state.intent?.revision ?? 0 });
const act = (state: FoundationState, action: IntentAction, now = 100, expected = token(state), foreground = true, permitted = true) =>
  foundationReducer(state, { command: 'intent', action, token: expected, now, foreground, permitted });
const edit = (state = active(), text = 'یک نیاز مشخص') => act(state, { kind: 'edit', text });
const awaiting = (state = edit()) => act(act(state, { kind: 'interpret' }), { kind: 'request_confirmation' });
const confirmed = () => act(awaiting(), { kind: 'confirm' });

describe('بنیاد Intent و مرز تأیید', () => {
  it('هر هفت وضعیت را بدون دسترسی Matching طی می‌کند', () => {
    const states = [active(), edit(), act(edit(), { kind: 'interpret' }), awaiting(), confirmed(),
      lifecycle(act(active(), { kind: 'edit', text: 'نیاز', expiresAt: 200 }), 'check', 200),
      act(edit(), { kind: 'cancel' })];
    expect(states.map(s => intentStatus(s.intent))).toEqual(['empty', 'collecting', 'interpreted', 'awaiting_confirmation', 'confirmed', 'expired', 'cancelled']);
    for (const s of states) expect(foundationExperience(s)).toMatchObject({ canMatch: false, canOpenBusiness: false, canInterpret: false });
  });
  it('تأیید فقط روی نسخه‌ی آماده تأیید انجام می‌شود؛ رضایت یا تفسیر تأیید نیست', () => {
    for (const s of [active(), edit(), act(edit(), { kind: 'interpret' })]) expect(act(s, { kind: 'confirm' })).toEqual(s);
    expect(confirmed().intent).toMatchObject({ status: 'confirmed', revision: 1, confirmedRevision: 1, confirmedAt: 100 });
  });
  it.each(['idle', 'consent', 'paused', 'closed'] as const)('پیش از اختیار فعال %s محتوایی دریافت نمی‌کند', phase => {
    const s = phase === 'idle' ? initialFoundation() : phase === 'consent' ? lifecycle(initialFoundation(), 'start')
      : lifecycle(active(), phase === 'paused' ? 'pause' : 'done');
    expect(act(s, { kind: 'edit', text: 'خصوصی' })).toEqual(s);
  });
  it('مرز foreground و اجازه پیش از دریافت متن اجرا می‌شود', () => {
    expect(act(active(), { kind: 'edit', text: 'خصوصی' }, 100, token(active()), false)).toMatchObject({ phase: 'paused', intent: null });
    expect(act(active(), { kind: 'edit', text: 'خصوصی' }, 100, token(active()), true, false)).toMatchObject({ phase: 'closed', intent: null });
  });
  it('ویرایش معنی‌دار revision جدید می‌سازد و تأیید قبلی را پاک می‌کند', () => {
    const before = confirmed();
    const next = act(before, { kind: 'edit', text: 'نیاز اصلاح‌شده' });
    expect(next.intent).toMatchObject({ revision: 2, status: 'collecting', interpretation: null, confirmedRevision: null, confirmedAt: null });
    expect(act(awaiting(next), { kind: 'confirm' }, 100, token(before)).intent?.status).toBe('awaiting_confirmation');
    expect(act(awaiting(next), { kind: 'confirm' }).intent?.confirmedRevision).toBe(2);
    expect(JSON.stringify(next)).not.toContain('یک نیاز مشخص');
  });
  it('تکرار همان بیان یا فاصله‌ی ابتدا/انتها، معنی و تأیید را تغییر نمی‌دهد', () => {
    const before = confirmed();
    const next = act(before, { kind: 'edit', text: '  یک نیاز مشخص  ' });
    expect(next.intent).toMatchObject({ revision: 1, status: 'confirmed', confirmedRevision: 1 });
  });
  it('فاصله‌ی انتهای متن هنگام تایپ حفظ می‌شود', () => {
    const s = act(edit(), { kind: 'edit', text: 'نیاز ' });
    expect(s.intent?.text).toBe('نیاز ');
    expect(act(s, { kind: 'interpret' }).intent?.interpretation).toBe('نیاز');
  });
  it('تغییر مهلت نیز revision را تغییر می‌دهد', () => {
    expect(act(confirmed(), { kind: 'edit', text: 'یک نیاز مشخص', expiresAt: 500 }).intent).toMatchObject({ revision: 2, status: 'collecting', confirmedRevision: null });
  });
  it('اصلاح صریح حتی پیش از تایپ دوباره تأیید را باطل می‌کند', () => {
    const s = act(confirmed(), { kind: 'correct' });
    expect(s.intent).toMatchObject({ status: 'collecting', revision: 2, confirmedRevision: null, interpretation: null, text: 'یک نیاز مشخص' });
  });
  it.each(['reject', 'cancel'] as const)('%s متن را پاک می‌کند و فرمان‌های دیررس آن را زنده نمی‌کنند', kind => {
    const before = confirmed();
    const s = act(before, { kind });
    expect(s.intent).toMatchObject({ status: 'cancelled', text: null, interpretation: null, confirmedRevision: null });
    for (const late of ['interpret', 'request_confirmation', 'confirm', 'correct'] as const) expect(act(s, { kind: late })).toEqual(s);
    expect(act(s, { kind: 'edit', text: 'ویرایش دیررس' }, 100, token(before))).toEqual(s);
    const next = edit(s, 'نیاز تازه');
    expect(next.intent).toMatchObject({ status: 'collecting', revision: 2 });
    expect(act(awaiting(next), { kind: 'confirm' }, 100, token(s)).intent?.status).toBe('awaiting_confirmation');
  });
  it.each(['', '   ', 'x'.repeat(MAX_INTENT_LENGTH + 1), 'text\u0000'])('ورودی نامعتبر تأیید قبلی را حفظ نمی‌کند', text => {
    const s = act(confirmed(), { kind: 'edit', text });
    expect(s.intent?.problem).not.toBeNull();
    expect(s.intent).toMatchObject({ text: null, confirmedRevision: null, interpretation: null, revision: 2 });
    expect(act(s, { kind: 'interpret' })).toEqual(s);
    expect(act(s, { kind: 'confirm' })).toEqual(s);
  });
  it.each([NaN, Infinity, 100, 99, SESSION_LIMIT_MS + 1])('مهلت نامعتبر %s تأیید نمی‌شود', expiresAt => {
    const s = act(confirmed(), { kind: 'edit', text: 'نیاز', expiresAt });
    expect(s.intent?.problem).toBe('invalid_deadline');
    expect(act(s, { kind: 'confirm' }).intent?.confirmedRevision).toBeNull();
  });
});

describe('نشست، نسل و انقضای Intent', () => {
  it.each(['done', 'dismiss', 'withdraw', 'navigate'] as const)('%s همه‌ی محتوای Intent را حذف می‌کند', command => {
    const before = confirmed();
    const s = lifecycle(before, command);
    expect(s.intent).toBeNull();
    expect(JSON.stringify(s)).not.toContain('یک نیاز مشخص');
    expect(act(s, { kind: 'edit', text: 'دیررس' }, 100, token(before))).toEqual(s);
  });
  it('نسل نشست از تأیید revision هم‌شماره در نشست جدید جلوگیری می‌کند', () => {
    const old = confirmed();
    const fresh = lifecycle(lifecycle(lifecycle(old, 'done'), 'start'), 'accept');
    const next = awaiting(edit(fresh));
    expect(next.intent?.revision).toBe(old.intent?.revision);
    expect(act(next, { kind: 'confirm' }, 100, token(old))).toEqual(next);
    expect(act(next, { kind: 'edit', text: 'دیررس' }, 100, token(old))).toEqual(next);
  });
  it('مکث اختیار فرمان قبلی را می‌گیرد و دیده‌شدن ادامه نیست', () => {
    const before = awaiting();
    const paused = lifecycle(before, 'hidden', 101, false);
    expect(act(paused, { kind: 'confirm' }, 102, token(before))).toEqual(paused);
    expect(lifecycle(paused, 'visible', 103)).toEqual(paused);
    const resumed = lifecycle(paused, 'resume', 104);
    expect(act(resumed, { kind: 'confirm' }, 105, token(before))).toEqual(resumed);
    expect(act(resumed, { kind: 'confirm' }, 105).intent?.status).toBe('confirmed');
  });
  it('تأیید نسخه‌ی بدون تغییر پس از ادامه حفظ می‌شود؛ Matching همچنان بسته است', () => {
    const before = confirmed();
    const s = lifecycle(lifecycle(before, 'pause'), 'resume', 101);
    expect(s.intent).toEqual(before.intent);
    expect(foundationExperience(s).canMatch).toBe(false);
  });
  it('در مرز انقضای نیاز، تأیید بدون اتکا به تایمر رد می‌شود', () => {
    const s = awaiting(act(active(), { kind: 'edit', text: 'موقت', expiresAt: 200 }));
    expect(act(s, { kind: 'confirm' }, 199).intent?.status).toBe('confirmed');
    const expired = act(s, { kind: 'confirm' }, 200);
    expect(expired.intent).toMatchObject({ status: 'expired', text: null, confirmedRevision: null });
    expect(expired.phase).toBe('active');
    expect(act(expired, { kind: 'correct' }, 201)).toEqual(expired);
    expect(act(expired, { kind: 'edit', text: 'تازه' }, 202).intent?.revision).toBe(2);
  });
  it('مهلت نیاز در حالت مخفی هم منقضی می‌شود', () => {
    const s = awaiting(act(active(), { kind: 'edit', text: 'موقت', expiresAt: 200 }));
    const paused = lifecycle(s, 'hidden', 101, false);
    expect(lifecycle(paused, 'check', 200, false).intent?.status).toBe('expired');
    expect(lifecycle(paused, 'resume', 200).intent?.status).toBe('expired');
  });
  it('ویرایش در صف، نمی‌تواند نسخه منقضی را دوباره بسازد', () => {
    const before = act(active(), { kind: 'edit', text: 'نیاز قدیمی', expiresAt: 200 });
    const expired = act(before, { kind: 'edit', text: 'ویرایش دیررس', expiresAt: 500 }, 200, token(before));
    expect(expired.intent).toMatchObject({ status: 'expired', text: null });
    expect(expired.generation).toBeGreaterThan(before.generation);
    expect(act(expired, { kind: 'edit', text: 'نیاز تازه' }, 201).intent).toMatchObject({ status: 'collecting', revision: 2 });
  });
  it('پایان نشست از تمدید زمان توسط تأیید یا ویرایش جلوگیری می‌کند', () => {
    for (const action of [{ kind: 'confirm' }, { kind: 'edit', text: 'جدید' }] as IntentAction[]) {
      expect(act(awaiting(), action, 100 + IDLE_LIMIT_MS)).toMatchObject({ phase: 'closed', intent: null, endedBy: 'expired' });
    }
    let s = confirmed();
    for (let now = 1_000_000; now < SESSION_LIMIT_MS; now += 1_000_000) s = lifecycle(s, 'activity', now);
    expect(act(s, { kind: 'correct' }, SESSION_LIMIT_MS)).toMatchObject({ phase: 'closed', intent: null });
  });
  it.each([NaN, Infinity, 99])('ساعت نامعتبر یا عقبگرد %s محتوای نشست را پاک می‌کند', now => {
    expect(act(confirmed(), { kind: 'confirm' }, now)).toMatchObject({ phase: 'closed', intent: null });
  });
  it('کاهش اجازه و رضایت، حتی پس از تأیید، اختیار را پاک می‌کند', () => {
    expect(act(confirmed(), { kind: 'correct' }, 100, token(confirmed()), true, false)).toMatchObject({ phase: 'closed', intent: null });
    const revoked = lifecycle(confirmed(), 'withdraw');
    expect(act(revoked, { kind: 'confirm' })).toEqual(revoked);
  });
  it('رویداد محیطی pagehide روی همان Core محتوای تأییدشده را حذف می‌کند', () => {
    let s = confirmed();
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState });
    const win = new EventTarget();
    const dispose = bindFoundationEnvironment({ document: doc, window: win, every: () => () => {} }, command => { s = lifecycle(s, command); });
    win.dispatchEvent(new Event('pagehide'));
    expect(s).toMatchObject({ intent: null, session: null });
    dispose();
    expect(initialFoundation().intent).toBeNull();
  });
});
