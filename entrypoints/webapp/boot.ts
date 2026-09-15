import '@/entrypoints/sidepanel/style.css';
import { installWebAppChrome } from '@/lib/webapp/chrome';
import { installSafeAreaVars } from '@/lib/webapp/safeArea';

window.__EC_WEBAPP__ = true;
document.documentElement.classList.add('ec-webapp');
installWebAppChrome();
installSafeAreaVars();

// iOS Safari: block gesture zoom (pinch).
document.addEventListener('gesturestart', (e) => e.preventDefault());

await import('./app');
