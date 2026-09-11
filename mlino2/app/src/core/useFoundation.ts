import { useCallback, useEffect, useReducer } from 'react';
import { allowsFoundation, foundationExperience, foundationReducer, initialFoundation } from './foundation';
import type { FoundationCommand } from './foundation';
import { bindFoundationEnvironment } from './foundationEnvironment';
import type { IntentAction, IntentToken } from './intent';

export function useFoundation() {
  const [state, dispatch] = useReducer(foundationReducer, undefined, initialFoundation);
  const send = useCallback((command: FoundationCommand) => {
    dispatch({
      command, now: Date.now(), foreground: document.visibilityState === 'visible',
      permitted: allowsFoundation(window.location.hostname, import.meta.env.DEV),
    });
  }, []);
  const intentToken: IntentToken = { generation: state.generation, revision: state.intent?.revision ?? 0 };
  const sendIntent = useCallback((action: IntentAction, token: IntentToken) => {
    dispatch({ command: 'intent', action, token, now: Date.now(),
      foreground: document.visibilityState === 'visible',
      permitted: allowsFoundation(window.location.hostname, import.meta.env.DEV) });
  }, []);
  useEffect(() => bindFoundationEnvironment({
    document, window,
    every: (callback, ms) => {
      const timer = window.setInterval(callback, ms);
      return () => window.clearInterval(timer);
    },
  }, send), [send]);
  return { state, experience: foundationExperience(state), send, sendIntent, intentToken };
}
