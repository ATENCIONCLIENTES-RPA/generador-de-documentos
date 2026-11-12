import { init } from './app/init.js';

import { initTheme } from './features/theme.js';
import { initMotion } from './features/motion.js';

let guideReady = null;
document.getElementById('btnGuide').addEventListener('click', async () => {
  guideReady ??= import('./features/guide.js').then(m => m.initGuide());
  (await guideReady)();
});

initTheme();
initMotion();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
