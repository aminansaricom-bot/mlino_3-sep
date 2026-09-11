import { expireIntent, intentStatus, reduceIntent } from './intent';
import type { IntentAction, IntentState, IntentToken } from './intent';
// مالکیت چرخه‌ی نشست، اجازه و Intent در Core می‌ماند؛ Matching غیرفعال است.
export const IDLE_LIMIT_MS = 30 * 60 * 1000;
export const SESSION_LIMIT_MS = 2 * 60 * 60 * 1000;
export type EndReason = 'done' | 'dismissed' | 'declined' | 'withdrawn' | 'permission' | 'expired' | 'navigation';
export type FoundationState = {
  phase: 'idle' | 'consent' | 'active' | 'paused' | 'closed';
  consent: boolean;
  session: { startedAt: number; lastActivityAt: number } | null;
  intent: IntentState | null;
  generation: number;
  endedBy: EndReason | null;
};
export type FoundationCommand =
  | 'start' | 'accept' | 'decline' | 'pause' | 'resume' | 'activity'
  | 'check' | 'hidden' | 'visible' | 'done' | 'dismiss' | 'withdraw' | 'navigate';
export type FoundationEvent = ({ command: FoundationCommand } | {
  command: 'intent'; action: IntentAction; token: IntentToken;
}) & {
  now: number;
  foreground: boolean;
  permitted: boolean;
};
export const initialFoundation = (): FoundationState => ({
  phase: 'idle', consent: false, session: null, intent: null, generation: 0, endedBy: null,
});
function close(state: FoundationState, reason: EndReason): FoundationState {
  return { ...initialFoundation(), phase: 'closed', endedBy: reason, generation: state.generation + 1 };
}
export function foundationReducer(state: FoundationState, event: FoundationEvent): FoundationState {
  const { command, now, foreground, permitted } = event;
  if (command === 'dismiss' || command === 'navigate') return close(state, command === 'navigate' ? 'navigation' : 'dismissed');
  if (command === 'withdraw') return close(state, 'withdrawn');
  if (command === 'done') return close(state, 'done');
  // Terminal sessions cannot revive from background events or late commands.
  if (state.phase === 'closed' && command !== 'start') return state;
  if (!permitted) return state.phase === 'closed' ? state : close(state, 'permission');
  if (!Number.isFinite(now)) return state.session ? close(state, 'expired') : state;
  if (state.session && (now < state.session.lastActivityAt ||
      now - state.session.startedAt >= SESSION_LIMIT_MS ||
      now - state.session.lastActivityAt >= IDLE_LIMIT_MS)) return close(state, 'expired');
  const currentIntent = expireIntent(state.intent, now);
  if (currentIntent !== state.intent) state = { ...state, intent: currentIntent, generation: state.generation + 1 };
  if (command === 'hidden' || !foreground) {
    return state.phase === 'active'
      ? { ...state, phase: 'paused', generation: state.generation + 1 }
      : state;
  }
  if (event.command === 'intent') {
    if (state.phase !== 'active' || !state.consent || !state.session ||
        event.token.generation !== state.generation || event.token.revision !== (state.intent?.revision ?? 0)) return state;
    const intent = reduceIntent(state.intent, event.action, now, state.session.startedAt + SESSION_LIMIT_MS);
    return intent === state.intent ? state
      : { ...state, intent,
        generation: intent?.status === 'cancelled' ? state.generation + 1 : state.generation,
        session: { ...state.session, lastActivityAt: now } };
  }
  switch (command) {
    case 'start':
      return state.phase === 'idle' || state.phase === 'closed'
        ? { ...initialFoundation(), phase: 'consent', session: { startedAt: now, lastActivityAt: now }, generation: state.generation + 1 }
        : state;
    case 'accept':
      return state.phase === 'consent' && state.session
        ? { ...state, phase: 'active', consent: true, session: { ...state.session, lastActivityAt: now } }
        : state;
    case 'decline':
      return state.phase === 'consent' ? close(state, 'declined') : state;
    case 'pause':
      return state.phase === 'active'
        ? { ...state, phase: 'paused', generation: state.generation + 1 }
        : state;
    case 'resume':
      return state.phase === 'paused' && state.consent && state.session
        ? { ...state, phase: 'active', session: { ...state.session, lastActivityAt: now }, generation: state.generation + 1 }
        : state;
    case 'activity':
      return state.phase === 'active' && state.session
        ? { ...state, session: { ...state.session, lastActivityAt: now } }
        : state;
    default:
      return state;
  }
}

// UI consumes this boundary; it cannot authorize interpretation, matching or business actions.
export function foundationExperience(state: FoundationState) {
  return {
    mode: state.phase === 'consent' ? 'request-consent' : state.phase === 'active' ? 'guide' : 'silent',
    route: 'assistant-shell',
    canInterpret: false,
    canEditIntent: state.phase === 'active' && state.consent,
    intentStatus: intentStatus(state.intent),
    canMatch: false,
    canOpenBusiness: false,
  } as const;
}

// This is a local foundation operation check, not a replacement for future V1 access control.
export function allowsFoundation(hostname: string, development: boolean): boolean {
  return development || ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
}
