import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { hydrateFromDisk, installAutoSave } from './services/persistence.init';

async function bootstrap() {
  try {
    await hydrateFromDisk();
  } catch (e) {
    console.warn('hydration failed', e);
  }
  installAutoSave();

  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
