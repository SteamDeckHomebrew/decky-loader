// Sets up DFL, then loads start.ts which starts up the loader
(async () => {
  console.debug('Setting up decky-frontend-lib...');
  window.DFL = await import('decky-frontend-lib');
  console.debug('decky-frontend-lib ready!');
  console.debug('window.DFL: ', window.DFL);
  await import('./start');
})();
