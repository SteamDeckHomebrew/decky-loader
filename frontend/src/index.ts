// Sets up DFL, then loads start.ts which starts up the loader
interface Window {
  // Shut up TS
  SP_REACTDOM: any;
}

(async () => {
  // Wait for main webpack chunks to definitely be loaded
  console.time('[Decky:Boot] Waiting for main Webpack chunks...');
  while (!window.webpackChunksteamui || window.webpackChunksteamui.length < 5) {
    await new Promise((r) => setTimeout(r, 10)); // Can't use DFL sleep here.
  }
  console.timeEnd('[Decky:Boot] Waiting for main Webpack chunks...');

  // Wait for the React root to be mounted
  console.time('[Decky:Boot] Waiting for React root mount...');
  let root;
  while (
    // Does React root node exist?
    !(root = document.getElementById('root')) ||
    // Does it have a child element?
    !(root as any)[Object.keys(root).find((k) => k.startsWith('__reactContainer$')) as string].child
  ) {
    await new Promise((r) => setTimeout(r, 10)); // Can't use DFL sleep here.
  }
  console.timeEnd('[Decky:Boot] Waiting for React root mount...');

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
