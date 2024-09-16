// Sets up DFL, then loads start.ts which starts up the loader
interface Window {
  // Shut up TS
  SP_REACTDOM: any;
  App: any; // TODO type BFinishedInitStageOne in @decky/ui
}

(async () => {
  console.debug('[Decky:Boot] Frontend init');

  console.time('[Decky:Boot] Waiting for SteamApp init stage 1 to finish...');

  while (!window.App?.BFinishedInitStageOne()) {
    await new Promise((r) => setTimeout(r, 0)); // Can't use DFL sleep here.
  }

  console.timeEnd('[Decky:Boot] Waiting for SteamApp init stage 1 to finish...');

  if (!window.SP_REACT) {
    console.debug('[Decky:Boot] Setting up Webpack & React globals...');
    // deliberate partial import
    const DFLWebpack = await import('@decky/ui/dist/webpack');
    window.SP_REACT = DFLWebpack.findModule((m) => m.Component && m.PureComponent && m.useLayoutEffect);
    window.SP_REACTDOM = DFLWebpack.findModule((m) => m.createPortal && m.createRoot);
  }
  console.debug('[Decky:Boot] Setting up @decky/ui...');
  window.DFL = await import('@decky/ui');
  console.debug('[Decky:Boot] Authenticating with Decky backend...');
  window.deckyAuthToken = await fetch('http://127.0.0.1:1337/auth/token').then((r) => r.text());
  console.debug('[Decky:Boot] Connecting to Decky backend...');
  window.DeckyBackend = new (await import('./wsrouter')).WSRouter();
  await DeckyBackend.connect();
  console.debug('[Decky:Boot] Starting Decky!');
  await import('./start');
})();
