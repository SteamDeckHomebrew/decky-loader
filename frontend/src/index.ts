// Sets up DFL, then loads start.ts which starts up the loader

interface Window {
  _deckyModuleResolverInternals: {
    scopes: Map<string, Record<string, any>>;
    scopedObjects: Map<number, any>;
  };
}

interface SteamAppInitialization {
  BFinishedInitBeforeLogin?: () => boolean;
  BFinishedInitStageOne?: () => boolean;
}

const isSteamAppInitialized = () => {
  const app = window.App as unknown as SteamAppInitialization | undefined;
  return app?.BFinishedInitBeforeLogin?.() ?? app?.BFinishedInitStageOne?.() ?? false;
};

(async () => {
  console.debug('[Decky:Boot] Frontend init');

  console.debug('[Decky:Boot] Authenticating with Decky backend...');
  window.deckyAuthToken = await fetch('http://127.0.0.1:1337/auth/token').then((r) => r.text());
  console.debug('[Decky:Boot] Connecting to Decky backend...');
  const ws = (window.DeckyBackend = new (await import('./wsrouter')).WSRouter());
  await ws.connect();

  console.time('[Decky:Boot] Waiting for SteamApp init stage 1 to finish...');

  while (!isSteamAppInitialized()) {
    await new Promise((r) => setTimeout(r, 0)); // Can't use DFL sleep here.
  }

  console.debug('[Decky:Boot] Setting up Module System & React globals...');

  let moduleId = 0;
  const int = (window._deckyModuleResolverInternals = {
    scopes: new Map(),
    scopedObjects: new Map(),
  });
  const resolveThroughBackend = ws.callable<[objectKey: number]>('instrumentation/resolve_scope');
  async function resolveModuleScope(objectFromScope: any, moduleForDebug?: string) {
    let ret;
    const id = ++moduleId;
    try {
      int.scopedObjects.set(id, objectFromScope);
      await resolveThroughBackend(id);
      ret = int.scopes.get(id);
    } catch (e) {
      console.debug(`[Decky:Instrumentation] Scope resolution failed for module ${moduleForDebug}`, e);
    } finally {
      int.scopes.delete(id);
      int.scopedObjects.delete(id);
    }
    return ret;
  }

  // deliberate partial import
  const DFLModules = await import('@decky/ui/dist/module-system');
  await DFLModules.initModules(resolveModuleScope);
  // @ts-ignore
  window.DFLModules = DFLModules;
  window.SP_REACT = DFLModules.findModule((m) => m.Component && m.PureComponent && m.useLayoutEffect);
  window.SP_REACTDOM =
    DFLModules.findModule((m) => m.createPortal && m.createRoot) ||
    DFLModules.findModule((m) => m.createPortal && m.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE);

  console.debug('[Decky:Boot] Setting up JSX internals...');
  const jsxModule = DFLModules.findModule((m) => (m.jsx && m.jsxs) || (m.jsx && Object.keys(m).length == 1));
  if (jsxModule?.jsxs) {
    window.SP_JSX = jsxModule;
  } else {
    window.SP_JSX = {
      jsx: jsxModule.jsx,
      jsxs: jsxModule.jsx,
      Fragment: window.SP_REACT.Fragment,
    };
  }
  console.debug('[Decky:Boot] Setting up @decky/ui...');
  window.DFL = await import('@decky/ui');
  console.debug('[Decky:Boot] Starting Decky!');
  await import('./start');
})();
