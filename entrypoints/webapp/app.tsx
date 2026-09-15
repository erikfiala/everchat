import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/entrypoints/sidepanel/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(
    () => undefined,
  );
}
