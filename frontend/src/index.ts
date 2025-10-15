// Sets up DFL, then loads start.ts which starts up the loader

(async () => {
  console.debug('[Decky:Boot] Frontend init');

  console.time('[Decky:Boot] Waiting for SteamApp init stage 1 to finish...');

  // @ts-expect-error TODO type BFinishedInitStageOne in @decky/ui
  while (!window.App?.BFinishedInitStageOne()) {
    await new Promise((r) => setTimeout(r, 0)); // Can't use DFL sleep here.
  }

  console.timeEnd('[Decky:Boot] Waiting for SteamApp init stage 1 to finish...');

  if (!window.SP_REACT) {
    console.debug('[Decky:Boot] Setting up Webpack & React globals...');
    // deliberate partial import
    const DFLWebpack = await import('@decky/ui/dist/webpack');
    window.SP_REACT = DFLWebpack.findModule((m) => m.Component && m.PureComponent && m.useLayoutEffect);
    window.SP_REACTDOM =
      DFLWebpack.findModule((m) => m.createPortal && m.createRoot) ||
      DFLWebpack.findModule((m) => m.createPortal && m.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE);

    console.debug('[Decky:Boot] Setting up JSX internals...');
    const jsx = DFLWebpack.findModule((m) => m.jsx && Object.keys(m).length == 1)?.jsx;
    if (jsx) {
      window.SP_JSX = {
        jsx,
        jsxs: jsx,
        Fragment: window.SP_REACT.Fragment,
      };
    }
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
