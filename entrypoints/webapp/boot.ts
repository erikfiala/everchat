import '@/entrypoints/sidepanel/style.css';
import { installWebAppChrome } from '@/lib/webapp/chrome';

window.__EC_WEBAPP__ = true;
document.documentElement.classList.add('ec-webapp');
installWebAppChrome();

// iOS Safari: block gesture zoom (pinch).
document.addEventListener('gesturestart', (e) => e.preventDefault());

await import('./app');
