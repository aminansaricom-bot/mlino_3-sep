import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkspaceProvider } from './workspace';
import { ChatSessionProvider } from './chat/session';
import Shell from './shell/Shell';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><WorkspaceProvider><ChatSessionProvider><Shell /></ChatSessionProvider></WorkspaceProvider></StrictMode>);
