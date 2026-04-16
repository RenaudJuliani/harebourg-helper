import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { hydrateFromDisk, installAutoSave } from './services/persistence.init';
import { installShortcuts } from './services/shortcuts.init';

async function bootstrap() {
  try {
    await hydrateFromDisk();
  } catch (e) {
    console.warn('hydration failed', e);
  }
  installAutoSave();
  try {
    await installShortcuts();
  } catch (e) {
    console.warn('shortcuts install failed', e);
  }

  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
