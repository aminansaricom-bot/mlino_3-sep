import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkspaceProvider } from './workspace';
import Shell from './shell/Shell';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><WorkspaceProvider><Shell /></WorkspaceProvider></StrictMode>);
