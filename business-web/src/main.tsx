import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkspaceProvider } from './workspace';
import { ChatSessionProvider } from './chat/session';
import Shell from './shell/Shell';
import './styles.css';
import './roshan.css';

createRoot(document.getElementById('root')!).render(<StrictMode><WorkspaceProvider><ChatSessionProvider><Shell /></ChatSessionProvider></WorkspaceProvider></StrictMode>);

// Local copies of the panel shell (sw.js). Production only; a failure changes nothing.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined); });
}
