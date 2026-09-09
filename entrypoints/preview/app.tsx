import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/entrypoints/sidepanel/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

try {
  window.parent.postMessage({ type: 'EC_PREVIEW_READY' }, '*');
} catch {
  /* ignore */
}
