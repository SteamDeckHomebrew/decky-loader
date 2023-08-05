// Sets up DFL, then loads start.ts which starts up the loader
(async () => {
  console.debug('Setting up decky-frontend-lib...');
  window.DFL = await import('decky-frontend-lib');
  console.debug('Authenticating to Decky backend...');
  window.deckyAuthToken = await fetch('http://127.0.0.1:1337/auth/token').then((r) => r.text());
  console.debug('Connecting to Decky backend...');
  window.DeckyBackend = new (await import('./wsrouter')).WSRouter();
  await window.DeckyBackend.connect();
  console.debug('Starting Decky!');
  await import('./start');
})();
