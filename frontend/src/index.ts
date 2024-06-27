// Sets up DFL, then loads start.ts which starts up the loader
interface Window {
  // Shut up TS
  SP_REACTDOM: any;
}

(async () => {
  // Wait for react to definitely be loaded
  while (!window.webpackChunksteamui || window.webpackChunksteamui <= 3) {
    await new Promise((r) => setTimeout(r, 10)); // Can't use DFL sleep here.
  }

  if (!window.SP_REACT) {
    console.debug('[Decky:Boot] Setting up React globals...');
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
