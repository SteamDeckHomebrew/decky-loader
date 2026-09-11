import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginLoadType } from './plugin';
import PluginLoader from './plugin-loader';

const mocks = vi.hoisted(() => ({
  checkForPluginUpdates: vi.fn(),
  getVersionInfo: vi.fn(),
  navigate: vi.fn(),
  setSetting: vi.fn(),
  sleep: vi.fn(() => Promise.resolve()),
}));

vi.hoisted(() => {
  Object.assign(globalThis, {
    DeckyBackend: {
      addEventListener: vi.fn(),
      call: vi.fn(),
      callable: vi.fn(() => vi.fn()),
    },
    deckyAuthToken: 'test-token',
  });
});

vi.mock('@decky/api', () => ({}));
vi.mock('@decky/ui', () => ({
  EUIMode: { GamePad: 1 },
  ModalRoot: vi.fn(),
  Navigation: { Navigate: mocks.navigate },
  PanelSection: vi.fn(),
  PanelSectionRow: vi.fn(),
  QuickAccessTab: { Decky: 1 },
  findSP: vi.fn(() => true),
  quickAccessMenuClasses: { FriendsTitle: '', Text: '' },
  showModal: vi.fn(),
  sleep: mocks.sleep,
}));
vi.mock('./components/DeckyIcon', () => ({ default: vi.fn() }));
vi.mock('./components/DeckyState', () => ({
  DeckyState: vi.fn(),
  DeckyStateContextProvider: vi.fn(),
  useDeckyState: vi.fn(),
}));
vi.mock('./components/modals/filepicker', () => ({ FileSelectionType: { FILE: 0, FOLDER: 1 } }));
vi.mock('./components/modals/filepicker/patches', () => ({
  deinitFilepickerPatches: vi.fn(),
  initFilepickerPatches: vi.fn(),
}));
vi.mock('./components/modals/MultiplePluginsInstallModal', () => ({ default: vi.fn() }));
vi.mock('./components/modals/PluginDisableModal', () => ({ default: vi.fn() }));
vi.mock('./components/modals/PluginInstallModal', () => ({ default: vi.fn() }));
vi.mock('./components/modals/PluginUninstallModal', () => ({ default: vi.fn() }));
vi.mock('./components/NotificationBadge', () => ({ default: vi.fn() }));
vi.mock('./components/PluginView', () => ({ default: vi.fn() }));
vi.mock('./components/QuickAccessVisibleState', () => ({ useQuickAccessVisible: vi.fn() }));
vi.mock('./components/WithSuspense', () => ({ default: vi.fn() }));
vi.mock('./errorboundary-hook', () => ({ default: vi.fn() }));
vi.mock('./frozen-plugins-service', () => ({ FrozenPluginService: vi.fn() }));
vi.mock('./hidden-plugins-service', () => ({ HiddenPluginsService: vi.fn() }));
vi.mock('./notification-service', () => ({ NotificationService: vi.fn() }));
vi.mock('./router-hook', () => ({ default: vi.fn() }));
vi.mock('./steamfixes', () => ({ deinitSteamFixes: vi.fn(), initSteamFixes: vi.fn() }));
vi.mock('./store', () => ({ checkForPluginUpdates: mocks.checkForPluginUpdates }));
vi.mock('./tabs-hook', () => ({ default: vi.fn() }));
vi.mock('./toaster', () => ({ default: vi.fn() }));
vi.mock('./updater', () => ({ getVersionInfo: mocks.getVersionInfo }));
vi.mock('./utils/settings', () => ({ getSetting: vi.fn(), setSetting: mocks.setSetting }));
vi.mock('./utils/TranslationHelper', () => ({
  default: vi.fn(),
  TranslationClass: { PLUGIN_LOADER: 'plugin-loader' },
}));

const backendCallable = vi.fn(() => vi.fn());
vi.stubGlobal('DeckyBackend', {
  addEventListener: vi.fn(),
  call: vi.fn(),
  callable: backendCallable,
});
vi.stubGlobal('deckyAuthToken', 'test-token');

type LoaderInternals = {
  checkForSP: ReturnType<typeof vi.fn>;
  deckyState: any;
  error: ReturnType<typeof vi.fn>;
  importReactPlugin: (request: {
    name: string;
    version?: string;
    loadType: PluginLoadType;
    timeoutMS?: number;
  }) => Promise<void>;
  importPlugin: PluginLoader['importPlugin'];
  log: ReturnType<typeof vi.fn>;
  pluginReloadQueue: { name: string; version?: string; loadType: PluginLoadType; timeoutMS?: number }[];
  pluginEventListeners: Map<string, Map<string, Set<(...args: any[]) => any>>>;
  pluginEventListener: PluginLoader['pluginEventListener'];
  plugins: any[];
  reloadLock: boolean;
  restartWebhelper: ReturnType<typeof vi.fn>;
  routerHook: any;
  toaster: any;
  unloadPlugin: PluginLoader['unloadPlugin'];
  updateVersion: PluginLoader['updateVersion'];
  notifyPluginUpdates: PluginLoader['notifyPluginUpdates'];
  notifyUpdates: PluginLoader['notifyUpdates'];
  [key: string]: any;
};

const createLoader = () => {
  const loader = Object.create(PluginLoader.prototype) as LoaderInternals;
  loader.plugins = [];
  loader.pluginReloadQueue = [];
  loader.pluginEventListeners = new Map();
  loader.reloadLock = false;
  loader.checkForSP = vi.fn(() => true);
  loader.restartWebhelper = vi.fn();
  loader.log = vi.fn();
  loader.error = vi.fn();
  loader.toaster = { toast: vi.fn() };
  loader.routerHook = { waitForUnlock: vi.fn() };
  loader.deckyState = {
    publicState: vi.fn(() => ({ disabledPlugins: [], frozenPlugins: [], installedPlugins: [] })),
    setDisabledPlugins: vi.fn(),
    setHasLoaderUpdate: vi.fn(),
    setPlugins: vi.fn(),
    setUpdates: vi.fn(),
    setVersionInfo: vi.fn(),
  };
  return loader;
};

describe('PluginLoader characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.stubGlobal('DeckyBackend', { addEventListener: vi.fn(), call: vi.fn(), callable: backendCallable });
    vi.stubGlobal('deckyAuthToken', 'test-token');
    vi.stubGlobal('fetch', vi.fn());
  });

  it('loads a legacy plugin and preserves its loader metadata', async () => {
    const loader = createLoader();
    const plugin = { icon: 'icon', content: 'content' };
    vi.mocked(fetch).mockResolvedValue({ ok: true, text: async () => `() => (${JSON.stringify(plugin)})` } as Response);

    await loader.importReactPlugin({
      name: 'Example',
      version: '1.2.3',
      loadType: PluginLoadType.LEGACY_EVAL_IIFE,
    });

    expect(loader.plugins).toEqual([
      { ...plugin, name: 'Example', version: '1.2.3', loadType: PluginLoadType.LEGACY_EVAL_IIFE },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:1337/plugins/Example/frontend_bundle',
      expect.objectContaining({
        credentials: 'include',
        headers: { 'X-Decky-Auth': 'test-token' },
      }),
    );
  });

  it('turns a failed legacy response into an error plugin and toast', async () => {
    const loader = createLoader();
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);

    await loader.importReactPlugin({
      name: 'Broken',
      version: '2.0.0',
      loadType: PluginLoadType.LEGACY_EVAL_IIFE,
    });

    expect(loader.plugins).toHaveLength(1);
    expect(loader.plugins[0]).toMatchObject({
      name: 'Broken',
      version: '2.0.0',
      loadType: PluginLoadType.LEGACY_EVAL_IIFE,
    });
    expect(loader.error).toHaveBeenCalledOnce();
    expect(loader.toaster.toast).toHaveBeenCalledOnce();
  });

  it('rethrows timeout errors without installing an error plugin', async () => {
    vi.useFakeTimers();
    const loader = createLoader();
    vi.mocked(fetch).mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );

    const result = loader.importReactPlugin({
      name: 'Slow',
      loadType: PluginLoadType.LEGACY_EVAL_IIFE,
      timeoutMS: 50,
    });
    const expectation = expect(result).rejects.toThrow('Slow failed to load within 0.05 second time limit');
    await vi.advanceTimersByTimeAsync(50);

    await expectation;
    expect(loader.plugins).toEqual([]);
    vi.useRealTimers();
  });

  it('rejects unknown load types as an error plugin', async () => {
    const loader = createLoader();

    await loader.importReactPlugin({ name: 'Unknown', loadType: 99 as PluginLoadType });

    expect(loader.plugins).toHaveLength(1);
    expect(loader.error).toHaveBeenCalledOnce();
  });

  it('restarts webhelper when SP disappears during plugin loading', async () => {
    const loader = createLoader();
    loader.checkForSP.mockReturnValueOnce(true).mockReturnValueOnce(false);
    vi.mocked(fetch).mockResolvedValue({ ok: true, text: async () => '() => ({ icon: "icon" })' } as Response);

    await loader.importReactPlugin({ name: 'Crashy', loadType: PluginLoadType.LEGACY_EVAL_IIFE });

    expect(loader.restartWebhelper).toHaveBeenCalledOnce();
  });

  it('serializes queued reloads with each request timeout', async () => {
    const loader = createLoader();
    loader.reloadLock = true;
    const importSpy = vi.spyOn(loader, 'importPlugin');

    await loader.importPlugin('Queued', '1.0.0', PluginLoadType.ESMODULE_V1, true, 750);
    expect(loader.pluginReloadQueue).toEqual([
      { name: 'Queued', version: '1.0.0', loadType: PluginLoadType.ESMODULE_V1, timeoutMS: 750 },
    ]);

    loader.reloadLock = false;
    vi.spyOn(loader, 'unloadPlugin').mockImplementation(() => undefined);
    vi.spyOn(loader, 'importReactPlugin').mockResolvedValue();
    await loader.importPlugin('Current', undefined, PluginLoadType.ESMODULE_V1, true, 250);

    expect(importSpy).toHaveBeenLastCalledWith('Queued', '1.0.0', PluginLoadType.ESMODULE_V1, true, 750);
  });

  it('notifies for loader and plugin updates in sequence', async () => {
    const loader = createLoader();
    const dismiss = vi.fn();
    loader.toaster.toast.mockReturnValue({ dismiss });
    loader.routerHook.waitForUnlock.mockResolvedValue(undefined);
    (loader as any).loaderUpdateToast = { dismiss };
    (loader as any).notificationService = { shouldNotify: vi.fn(() => true) };
    vi.spyOn(loader, 'updateVersion').mockResolvedValue({ current: '1.0.0', remote: { tag_name: '2.0.0' } } as any);
    vi.spyOn(loader, 'notifyPluginUpdates').mockResolvedValue(undefined);

    await loader.notifyUpdates();

    expect(loader.deckyState.setHasLoaderUpdate).toHaveBeenCalledWith(true);
    expect(dismiss).toHaveBeenCalledOnce();
    expect(loader.routerHook.waitForUnlock).toHaveBeenCalledOnce();
    expect(loader.toaster.toast).toHaveBeenCalledOnce();
    expect(mocks.sleep).toHaveBeenCalledWith(7000);
    expect(loader.notifyPluginUpdates).toHaveBeenCalledOnce();
  });

  it('filters frozen plugins before checking and stores available updates', async () => {
    const loader = createLoader();
    const updates = new Map([['Active', { version: '2.0.0' }]]);
    loader.deckyState.publicState.mockReturnValue({
      frozenPlugins: ['Frozen'],
      installedPlugins: [{ name: 'Active' }, { name: 'Frozen' }],
    });
    mocks.checkForPluginUpdates.mockResolvedValue(updates);

    await expect(loader.checkPluginUpdates()).resolves.toBe(updates);

    expect(mocks.checkForPluginUpdates).toHaveBeenCalledWith([{ name: 'Active' }]);
    expect(loader.deckyState.setUpdates).toHaveBeenCalledWith(updates);
  });

  it('only creates a plugin update toast when updates and permission are present', async () => {
    const loader = createLoader();
    (loader as any).notificationService = { shouldNotify: vi.fn(() => true) };
    vi.spyOn(loader, 'checkPluginUpdates').mockResolvedValue(new Map([['Example', {}]]) as any);

    await loader.notifyPluginUpdates();
    expect(loader.toaster.toast).toHaveBeenCalledOnce();

    loader.toaster.toast.mockClear();
    vi.mocked(loader.checkPluginUpdates).mockResolvedValue(new Map());
    await loader.notifyPluginUpdates();
    expect(loader.toaster.toast).not.toHaveBeenCalled();
  });

  it('updates user settings and version state from backend data', async () => {
    const loader = createLoader();
    vi.mocked(DeckyBackend.call).mockResolvedValue({ username: 'deck-user', path: '/home/deck' });
    mocks.getVersionInfo.mockResolvedValue({ current: '1.0.0' });

    await loader.getUserInfo();
    await expect(loader.updateVersion()).resolves.toEqual({ current: '1.0.0' });

    expect(mocks.setSetting).toHaveBeenCalledWith('user_info.user_name', 'deck-user');
    expect(mocks.setSetting).toHaveBeenCalledWith('user_info.user_home', '/home/deck');
    expect(loader.deckyState.setVersionInfo).toHaveBeenCalledWith({ current: '1.0.0' });
  });

  it('dismounts, disables, and unloads plugins while maintaining state', () => {
    const loader = createLoader();
    const onDismount = vi.fn();
    loader.plugins = [
      { name: 'One', version: '1.0.0', onDismount },
      { name: 'Two', version: '2.0.0' },
    ];

    expect(loader.hasPlugin('One')).toBe(true);
    loader.dismountAll();
    expect(onDismount).toHaveBeenCalledOnce();

    loader.doDisablePlugin('One');
    expect(loader.plugins.map((plugin) => plugin.name)).toEqual(['Two']);
    expect(loader.deckyState.setDisabledPlugins).toHaveBeenCalledWith([{ name: 'One', version: '1.0.0' }]);

    loader.unloadPlugin('Two');
    expect(loader.plugins).toEqual([]);
    expect(loader.deckyState.setPlugins).toHaveBeenLastCalledWith([]);
  });

  it('proxies external fetches with authentication and prefixed headers', async () => {
    const loader = createLoader();
    const response = { ok: true } as Response;
    vi.mocked(fetch).mockResolvedValue(response);

    await expect(
      loader.fetchNoCors('https://example.com/a b', {
        method: 'PUT',
        headers: { Accept: 'application/json', 'X-Custom': 'yes' },
        excludedHeaders: ['cookie', 'origin'],
      }),
    ).resolves.toBe(response);

    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:1337/fetch?auth=test-token&fetch_url=https%3A%2F%2Fexample.com%2Fa%20b',
      {
        method: 'PUT',
        excludedHeaders: ['cookie', 'origin'],
        credentials: 'include',
        headers: {
          'X-Decky-Header-Accept': 'application/json',
          'X-Decky-Header-X-Custom': 'yes',
          'X-Decky-Fetch-Excluded-Headers': 'cookie, origin',
        },
      },
    );
  });

  it('adapts legacy HTTP requests and reports backend failures', async () => {
    const loader = createLoader();
    vi.mocked(DeckyBackend.call).mockResolvedValueOnce({ status: 200, headers: {}, body: 'ok' });

    await expect(loader.legacyFetchNoCors('https://example.com', { body: 'payload' })).resolves.toEqual({
      success: true,
      result: { status: 200, headers: {}, body: 'ok' },
    });
    expect(DeckyBackend.call).toHaveBeenLastCalledWith('utilities/http_request', 'POST', 'https://example.com', {
      headers: {},
      data: 'payload',
    });

    vi.mocked(DeckyBackend.call).mockRejectedValueOnce(new Error('offline'));
    await expect(loader.legacyFetchNoCors('https://example.com', { method: 'GET' })).resolves.toEqual({
      success: false,
      result: 'Error: offline',
    });
  });

  it('creates versioned backend APIs with managed event listeners', () => {
    const loader = createLoader();
    loader.routerHook = {};
    loader.toaster = {};
    vi.stubGlobal('window', {});

    loader.initPluginBackendAPI();
    const connect = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit!.connect;
    const api = connect(2, 'Example');
    const listener = vi.fn();

    expect(api._version).toBe(2);
    expect(api.useQuickAccessVisible).toBeDefined();
    expect(api.addEventListener('changed', listener)).toBe(listener);
    expect(loader.pluginEventListeners.get('Example')?.get('changed')?.has(listener)).toBe(true);
    api.removeEventListener('changed', listener);
    expect(loader.pluginEventListeners.get('Example')?.get('changed')?.has(listener)).toBe(false);
  });
});
