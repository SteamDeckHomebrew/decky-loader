import { ToastNotification } from '@decky/api';
import {
  EUIMode,
  ModalRoot,
  Navigation,
  PanelSection,
  PanelSectionRow,
  QuickAccessTab,
  findSP,
  quickAccessMenuClasses,
  showModal,
  sleep,
} from '@decky/ui';
import { FC, lazy } from 'react';
import { FaDownload, FaExclamationCircle, FaPlug } from 'react-icons/fa';

import DeckyIcon from './components/DeckyIcon';
import { DeckyState, DeckyStateContextProvider, UserInfo, useDeckyState } from './components/DeckyState';
import { File, FileSelectionType } from './components/modals/filepicker';
import { deinitFilepickerPatches, initFilepickerPatches } from './components/modals/filepicker/patches';
import MultiplePluginsInstallModal from './components/modals/MultiplePluginsInstallModal';
import PluginInstallModal from './components/modals/PluginInstallModal';
import PluginUninstallModal from './components/modals/PluginUninstallModal';
import NotificationBadge from './components/NotificationBadge';
import PluginView from './components/PluginView';
import { useQuickAccessVisible } from './components/QuickAccessVisibleState';
import WithSuspense from './components/WithSuspense';
import ErrorBoundaryHook from './errorboundary-hook';
import { FrozenPluginService } from './frozen-plugins-service';
import { HiddenPluginsService } from './hidden-plugins-service';
import Logger from './logger';
import { NotificationService } from './notification-service';
import { InstallType, Plugin, PluginLoadType } from './plugin';
import RouterHook from './router-hook';
import { deinitSteamFixes, initSteamFixes } from './steamfixes';
import { checkForPluginUpdates } from './store';
import TabsHook from './tabs-hook';
import Toaster from './toaster';
import { getVersionInfo } from './updater';
import { getSetting, setSetting } from './utils/settings';
import TranslationHelper, { TranslationClass } from './utils/TranslationHelper';

const StorePage = lazy(() => import('./components/store/Store'));
const SettingsPage = lazy(() => import('./components/settings'));

const FilePicker = lazy(() => import('./components/modals/filepicker'));

declare global {
  interface Window {
    __DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit?: {
      connect: (version: number, key: string) => any; // Returns the backend API used above, no real point adding types to this.
    };
  }
}

/** Map of event names to event listeners */
type listenerMap = Map<string, Set<(...args: any) => any>>;

interface DeckyRequestInit extends RequestInit {
  excludedHeaders: string[];
}

const callPluginMethod = DeckyBackend.callable<[pluginName: string, method: string, ...args: any], any>(
  'loader/call_plugin_method',
);

class PluginLoader extends Logger {
  private plugins: Plugin[] = [];
  public errorBoundaryHook: ErrorBoundaryHook = new ErrorBoundaryHook();
  private tabsHook: TabsHook = new TabsHook();
  public routerHook: RouterHook = new RouterHook();
  public toaster: Toaster = new Toaster();
  private deckyState: DeckyState = new DeckyState();
  // stores a map of plugin names to all their event listeners
  private pluginEventListeners: Map<string, listenerMap> = new Map();

  public frozenPluginsService = new FrozenPluginService(this.deckyState);
  public hiddenPluginsService = new HiddenPluginsService(this.deckyState);
  public notificationService = new NotificationService(this.deckyState);

  private reloadLock: boolean = false;
  // stores a list of plugin names which requested to be reloaded
  private pluginReloadQueue: { name: string; version?: string; loadType: PluginLoadType }[] = [];

  private loaderUpdateToast?: ToastNotification;
  private pluginUpdateToast?: ToastNotification;

  constructor() {
    super(PluginLoader.name);

    DeckyBackend.addEventListener('loader/notify_updates', this.notifyUpdates.bind(this));
    DeckyBackend.addEventListener('loader/import_plugin', this.importPlugin.bind(this));
    DeckyBackend.addEventListener('loader/unload_plugin', this.unloadPlugin.bind(this));
    DeckyBackend.addEventListener('loader/add_plugin_install_prompt', this.addPluginInstallPrompt.bind(this));
    DeckyBackend.addEventListener(
      'loader/add_multiple_plugins_install_prompt',
      this.addMultiplePluginsInstallPrompt.bind(this),
    );
    DeckyBackend.addEventListener('updater/update_download_percentage', () => {
      this.deckyState.setIsLoaderUpdating(true);
    });
    DeckyBackend.addEventListener(`loader/plugin_event`, this.pluginEventListener);

    this.tabsHook.init();

    const TabBadge = () => {
      const { updates, hasLoaderUpdate } = useDeckyState();
      return <NotificationBadge show={(updates && updates.size > 0) || hasLoaderUpdate} />;
    };

    this.tabsHook.add({
      id: QuickAccessTab.Decky,
      title: null,
      content: (
        <DeckyStateContextProvider deckyState={this.deckyState}>
          <PluginView />
        </DeckyStateContextProvider>
      ),
      icon: (
        <DeckyStateContextProvider deckyState={this.deckyState}>
          <FaPlug />
          <TabBadge />
        </DeckyStateContextProvider>
      ),
    });

    this.routerHook.addRoute('/decky/store', () => (
      <DeckyStateContextProvider deckyState={this.deckyState}>
        <WithSuspense route={true}>
          <StorePage />
        </WithSuspense>
      </DeckyStateContextProvider>
    ));
    this.routerHook.addRoute('/decky/settings', () => {
      return (
        <DeckyStateContextProvider deckyState={this.deckyState}>
          <WithSuspense route={true}>
            <SettingsPage />
          </WithSuspense>
        </DeckyStateContextProvider>
      );
    });

    initSteamFixes();

    initFilepickerPatches();

    this.initPluginBackendAPI();

    Promise.all([this.getUserInfo(), this.updateVersion()])
      .then(() => this.loadPlugins())
      .then(() => this.log('Initialized'))
      .then(() => sleep(30000)) // Internet might not immediately be up
      .then(() => this.checkPluginUpdates());
  }

  private checkForSP(): boolean {
    try {
      return !!findSP();
    } catch (e) {
      this.warn('Error checking for SP tab', e);
      return false;
    }
  }

  private async runCrashChecker() {
    const spExists = this.checkForSP();
    await sleep(5000);
    if (spExists && !this.checkForSP()) {
      // SP died after plugin loaded. Give up and let the loader's crash loop detection handle it.
      this.error('SP died during startup. Restarting webhelper.');
      await this.restartWebhelper();
    }
  }

  private getPluginsFromBackend = DeckyBackend.callable<
    [],
    { name: string; version: string; load_type: PluginLoadType }[]
  >('loader/get_plugins');

  private restartWebhelper = DeckyBackend.callable<[], void>('utilities/restart_webhelper');

  private async loadPlugins() {
    let registration: any;
    const uiMode = await new Promise(
      (r) =>
        (registration = SteamClient.UI.RegisterForUIModeChanged((mode: EUIMode) => {
          r(mode);
          registration.unregister();
        })),
    );
    if (uiMode == EUIMode.GamePad) {
      // wait for SP window to exist before loading plugins
      while (!findSP()) {
        await sleep(100);
      }
    }
    this.runCrashChecker();
    const plugins = await this.getPluginsFromBackend();
    const pluginLoadPromises = [];
    const loadStart = performance.now();
    for (const plugin of plugins) {
      if (!this.hasPlugin(plugin.name))
        pluginLoadPromises.push(this.importPlugin(plugin.name, plugin.version, plugin.load_type, false));
    }
    await Promise.all(pluginLoadPromises);
    const loadEnd = performance.now();
    this.log(`Loaded ${plugins.length} plugins in ${loadEnd - loadStart}ms`);

    this.checkPluginUpdates();
  }

  public async getUserInfo() {
    const userInfo = await DeckyBackend.call<[], UserInfo>('utilities/get_user_info');
    setSetting('user_info.user_name', userInfo.username);
    setSetting('user_info.user_home', userInfo.path);
  }

  public async updateVersion() {
    const versionInfo = await getVersionInfo();
    this.deckyState.setVersionInfo(versionInfo);

    return versionInfo;
  }

  public async notifyUpdates() {
    const versionInfo = await this.updateVersion();
    if (versionInfo?.remote && versionInfo?.remote?.tag_name != versionInfo?.current) {
      this.deckyState.setHasLoaderUpdate(true);
      if (this.notificationService.shouldNotify('deckyUpdates')) {
        this.loaderUpdateToast && this.loaderUpdateToast.dismiss();
        await this.routerHook.waitForUnlock();
        this.loaderUpdateToast = this.toaster.toast({
          title: <TranslationHelper transClass={TranslationClass.PLUGIN_LOADER} transText="decky_title" />,
          body: (
            <TranslationHelper
              transClass={TranslationClass.PLUGIN_LOADER}
              transText="decky_update_available"
              i18nArgs={{ tag_name: versionInfo?.remote?.tag_name }}
            />
          ),
          logo: <DeckyIcon />,
          icon: <FaDownload />,
          onClick: () => Navigation.Navigate('/decky/settings'),
        });
      }
    }
    await sleep(7000);
    await this.notifyPluginUpdates();
  }

  public async checkPluginUpdates() {
    const frozenPlugins = this.deckyState.publicState().frozenPlugins;

    const updates = await checkForPluginUpdates(this.plugins.filter((p) => !frozenPlugins.includes(p.name)));
    this.deckyState.setUpdates(updates);
    return updates;
  }

  public async notifyPluginUpdates() {
    const updates = await this.checkPluginUpdates();
    if (updates?.size > 0 && this.notificationService.shouldNotify('pluginUpdates')) {
      this.pluginUpdateToast && this.pluginUpdateToast.dismiss();
      this.pluginUpdateToast = this.toaster.toast({
        title: <TranslationHelper transClass={TranslationClass.PLUGIN_LOADER} transText="decky_title" />,
        body: (
          <TranslationHelper
            transClass={TranslationClass.PLUGIN_LOADER}
            transText="plugin_update"
            i18nArgs={{ count: updates.size }}
          />
        ),
        logo: <DeckyIcon />,
        icon: <FaDownload />,
        onClick: () => Navigation.Navigate('/decky/settings/plugins'),
      });
    }
  }

  public addPluginInstallPrompt(
    artifact: string,
    version: string,
    request_id: string,
    hash: string,
    install_type: number,
  ) {
    showModal(
      <PluginInstallModal
        artifact={artifact}
        version={version}
        hash={hash}
        installType={install_type}
        onOK={() => DeckyBackend.call<[string]>('utilities/confirm_plugin_install', request_id)}
        onCancel={() => DeckyBackend.call<[string]>('utilities/cancel_plugin_install', request_id)}
      />,
    );
  }

  public addMultiplePluginsInstallPrompt(
    request_id: string,
    requests: { name: string; version: string; hash: string; install_type: InstallType }[],
  ) {
    showModal(
      <MultiplePluginsInstallModal
        requests={requests}
        onOK={() => DeckyBackend.call<[string]>('utilities/confirm_plugin_install', request_id)}
        onCancel={() => DeckyBackend.call<[string]>('utilities/cancel_plugin_install', request_id)}
      />,
    );
  }

  public uninstallPlugin(name: string, title: string, buttonText: string, description: string) {
    showModal(<PluginUninstallModal name={name} title={title} buttonText={buttonText} description={description} />);
  }

  public hasPlugin(name: string) {
    return Boolean(this.plugins.find((plugin) => plugin.name == name));
  }

  public dismountAll() {
    for (const plugin of this.plugins) {
      this.log(`Dismounting ${plugin.name}`);
      plugin.onDismount?.();
    }
  }

  public init() {
    getSetting('developer.enabled', false).then((val) => {
      if (val) import('./developer').then((developer) => developer.startup());
    });

    // Grab and set plugin order
    getSetting<string[]>('pluginOrder', []).then((pluginOrder) => {
      this.debug('pluginOrder: ', pluginOrder);
      this.deckyState.setPluginOrder(pluginOrder);
    });

    this.frozenPluginsService.init();
    this.hiddenPluginsService.init();
    this.notificationService.init();
  }

  public deinit() {
    this.routerHook.removeRoute('/decky/store');
    this.routerHook.removeRoute('/decky/settings');
    deinitSteamFixes();
    deinitFilepickerPatches();
    this.routerHook.deinit();
    this.tabsHook.deinit();
    this.toaster.deinit();
    this.errorBoundaryHook.deinit();
  }

  public unloadPlugin(name: string, skipStateUpdate: boolean = false) {
    const plugin = this.plugins.find((plugin) => plugin.name === name);
    plugin?.onDismount?.();
    this.plugins = this.plugins.filter((p) => p !== plugin);
    if (!skipStateUpdate) this.deckyState.setPlugins(this.plugins);
  }

  public async importPlugin(
    name: string,
    version?: string | undefined,
    loadType: PluginLoadType = PluginLoadType.ESMODULE_V1,
    useQueue: boolean = true,
  ) {
    if (useQueue && this.reloadLock) {
      this.log('Reload currently in progress, adding to queue', name);
      this.pluginReloadQueue.push({ name, version: version, loadType });
      return;
    }

    try {
      if (useQueue) this.reloadLock = true;
      this.log(`Trying to load ${name}`);

      this.unloadPlugin(name, true);
      const startTime = performance.now();
      await this.importReactPlugin(name, version, loadType);
      const endTime = performance.now();

      this.deckyState.setPlugins(this.plugins);
      this.log(`Loaded ${name} in ${endTime - startTime}ms`);
    } catch (e) {
      throw e;
    } finally {
      if (useQueue) {
        this.reloadLock = false;
        const nextPlugin = this.pluginReloadQueue.shift();
        if (nextPlugin) {
          this.importPlugin(nextPlugin.name, nextPlugin.version, loadType);
        }
      }
    }
  }

  private async importReactPlugin(
    name: string,
    version?: string,
    loadType: PluginLoadType = PluginLoadType.ESMODULE_V1,
  ) {
    let spExists = this.checkForSP();
    try {
      switch (loadType) {
        case PluginLoadType.ESMODULE_V1:
          const plugin_exports = await import(`http://127.0.0.1:1337/plugins/${name}/dist/index.js?t=${Date.now()}`);
          let plugin = plugin_exports.default();

          this.plugins.push({
            ...plugin,
            name: name,
            version: version,
            loadType,
          });
          break;

        case PluginLoadType.LEGACY_EVAL_IIFE:
          let res = await fetch(`http://127.0.0.1:1337/plugins/${name}/frontend_bundle`, {
            credentials: 'include',
            headers: {
              'X-Decky-Auth': deckyAuthToken,
            },
          });
          if (res.ok) {
            let plugin_export: (serverAPI: any) => Plugin = await eval(
              (await res.text()) + `\n//# sourceURL=decky://decky/legacy_plugin/${encodeURIComponent(name)}/index.js`,
            );
            let plugin = plugin_export(this.createLegacyPluginAPI(name));
            this.plugins.push({
              ...plugin,
              name: name,
              version: version,
              loadType,
            });
          } else throw new Error(`${name} frontend_bundle not OK`);
          break;

        default:
          throw new Error(`${name} has no defined loadType.`);
      }
    } catch (e) {
      this.error('Error loading plugin ' + name, e);
      const TheError: FC<{}> = () => (
        <PanelSection>
          <PanelSectionRow>
            <div className={quickAccessMenuClasses.FriendsTitle} style={{ display: 'flex', justifyContent: 'center' }}>
              <TranslationHelper transClass={TranslationClass.PLUGIN_LOADER} transText="error" />
            </div>
          </PanelSectionRow>
          <PanelSectionRow>
            <pre style={{ overflowX: 'scroll' }}>
              <code>{e instanceof Error ? '' + e.stack : JSON.stringify(e)}</code>
            </pre>
          </PanelSectionRow>
          <PanelSectionRow>
            <div className={quickAccessMenuClasses.Text}>
              <TranslationHelper
                transClass={TranslationClass.PLUGIN_LOADER}
                transText="plugin_error_uninstall"
                i18nArgs={{ name: name }}
              />
            </div>
          </PanelSectionRow>
        </PanelSection>
      );
      this.plugins.push({
        name: name,
        version: version,
        content: <TheError />,
        icon: <FaExclamationCircle />,
        loadType,
      });
      this.toaster.toast({
        title: (
          <TranslationHelper
            transClass={TranslationClass.PLUGIN_LOADER}
            transText="plugin_load_error.toast"
            i18nArgs={{ name: name }}
          />
        ),
        body: '' + e,
        icon: <FaExclamationCircle />,
      });
    }

    if (spExists && !this.checkForSP()) {
      // SP died after plugin loaded. Give up and let the loader's crash loop detection handle it.
      this.error('SP died after loading plugin. Restarting webhelper.');
      await this.restartWebhelper();
    }
  }

  async callServerMethod(methodName: string, args = {}) {
    this.warn(
      `Calling ${methodName} via callServerMethod, which is deprecated and will be removed in a future release. Please switch to the backend API.`,
    );
    return await DeckyBackend.call<[methodName: string, kwargs: any], any>(
      'utilities/_call_legacy_utility',
      methodName,
      args,
    );
  }

  openFilePickerLegacy(
    startPath: string,
    selectFiles?: boolean,
    regex?: RegExp,
  ): Promise<{ path: string; realpath: string }> {
    this.warn('openFilePicker is deprecated and will be removed. Please migrate to openFilePickerV2');
    if (selectFiles) {
      return this.openFilePicker(FileSelectionType.FILE, startPath, true, true, regex);
    } else {
      return this.openFilePicker(FileSelectionType.FOLDER, startPath, false, true, regex);
    }
  }

  openFilePicker(
    select: FileSelectionType,
    startPath: string,
    includeFiles?: boolean,
    includeFolders?: boolean,
    filter?: RegExp | ((file: File) => boolean),
    extensions?: string[],
    showHiddenFiles?: boolean,
    allowAllFiles?: boolean,
    max?: number,
  ): Promise<{ path: string; realpath: string }> {
    return new Promise((resolve, reject) => {
      const Content = ({ closeModal }: { closeModal?: () => void }) => (
        // Purposely outside of the FilePicker component as lazy-loaded ModalRoots don't focus correctly
        <ModalRoot
          onCancel={() => {
            reject('User canceled');
            closeModal?.();
          }}
        >
          <WithSuspense>
            <FilePicker
              startPath={startPath}
              includeFiles={includeFiles}
              includeFolders={includeFolders}
              filter={filter}
              validFileExtensions={extensions}
              allowAllFiles={allowAllFiles}
              defaultHidden={showHiddenFiles}
              onSubmit={resolve}
              closeModal={closeModal}
              fileSelType={select}
              max={max}
            />
          </WithSuspense>
        </ModalRoot>
      );
      showModal(<Content />);
    });
  }

  // Useful for audio/video streams
  getExternalResourceURL(url: string) {
    return `http://127.0.0.1:1337/fetch?auth=${deckyAuthToken}&fetch_url=${encodeURIComponent(url)}`;
  }

  // Same syntax as fetch but only supports the url-based syntax and an object for headers since it's the most common usage pattern
  fetchNoCors(input: string, init?: DeckyRequestInit | undefined): Promise<Response> {
    const { headers: initHeaders = {}, ...restOfInit } = init || {};
    const getPrefixedHeaders = () => {
      let prefixedInitHeaders: { [name: string]: any } = {};
      for (const [key, value] of Object.entries(initHeaders)) {
        prefixedInitHeaders[`X-Decky-Header-${key}`] = value;
      }
      return prefixedInitHeaders;
    };
    const headers: { [name: string]: string } = getPrefixedHeaders();

    if (init?.excludedHeaders) {
      headers['X-Decky-Fetch-Excluded-Headers'] = init.excludedHeaders.join(', ');
    }

    return fetch(this.getExternalResourceURL(input), {
      ...restOfInit,
      credentials: 'include',
      headers,
    });
  }

  async legacyFetchNoCors(url: string, request: any = {}) {
    let method: string;
    const req = { headers: {}, ...request, data: request.body };
    req?.body && delete req.body;
    if (!request.method) {
      method = 'POST';
    } else {
      method = request.method;
      delete req.method;
    }
    try {
      const ret = await DeckyBackend.call<
        [method: string, url: string, extra_opts?: any],
        { status: number; headers: { [key: string]: string }; body: string }
      >('utilities/http_request', method, url, req);
      return { success: true, result: ret };
    } catch (e) {
      return { success: false, result: e?.toString() };
    }
  }

  initPluginBackendAPI() {
    // Things will break *very* badly if plugin code touches this outside of @decky/api, so lets make that clear.
    window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit = {
      connect: (version: number, pluginName: string) => {
        if (version < 1 || version > 2) {
          console.warn(`Plugin ${pluginName} requested unsupported api version ${version}.`);
        }

        const eventListeners: listenerMap = new Map();
        this.pluginEventListeners.set(pluginName, eventListeners);

        const backendAPI = {
          call: (methodName: string, ...args: any) => {
            return callPluginMethod(pluginName, methodName, ...args);
          },
          callable: (methodName: string) => {
            return (...args: any) => callPluginMethod(pluginName, methodName, ...args);
          },
          addEventListener: (event: string, listener: (...args: any) => any) => {
            if (!eventListeners.has(event)) {
              eventListeners.set(event, new Set([listener]));
            } else {
              eventListeners.get(event)?.add(listener);
            }
            return listener;
          },
          removeEventListener: (event: string, listener: (...args: any) => any) => {
            if (eventListeners.has(event)) {
              const set = eventListeners.get(event);
              set?.delete(listener);
            }
          },
          openFilePicker: this.openFilePicker.bind(this),
          executeInTab: DeckyBackend.callable<
            [tab: String, runAsync: Boolean, code: string],
            { success: boolean; result: any }
          >('utilities/execute_in_tab'),
          fetchNoCors: this.fetchNoCors.bind(this),
          getExternalResourceURL: this.getExternalResourceURL.bind(this),
          injectCssIntoTab: DeckyBackend.callable<[tab: string, style: string], string>(
            'utilities/inject_css_into_tab',
          ),
          removeCssFromTab: DeckyBackend.callable<[tab: string, cssId: string]>('utilities/remove_css_from_tab'),
          routerHook: this.routerHook,
          toaster: this.toaster,
          _version: 1,
        } as any;

        if (version >= 2) {
          backendAPI._version = 2;
          backendAPI.useQuickAccessVisible = useQuickAccessVisible;
        }

        this.debug(`${pluginName} connected to loader API.`);
        return backendAPI;
      },
    };
  }

  pluginEventListener = (data: { plugin: string; event: string; args: any }) => {
    const { plugin, event, args } = data;
    this.debug(`Recieved plugin event ${event} for ${plugin} with args`, args);
    if (!this.pluginEventListeners.has(plugin)) {
      this.warn(`plugin ${plugin} does not have event listeners`);
      return;
    }
    const eventListeners = this.pluginEventListeners.get(plugin)!;
    if (eventListeners.has(event)) {
      for (const listener of eventListeners.get(event)!) {
        (async () => {
          try {
            await listener(...args);
          } catch (e) {
            this.error(`error in event ${event}`, e, listener);
          }
        })();
      }
    } else {
      this.warn(`event ${event} has no listeners`);
    }
  };

  createLegacyPluginAPI(pluginName: string) {
    const pluginAPI = {
      routerHook: this.routerHook,
      toaster: this.toaster,
      // Legacy
      callServerMethod: this.callServerMethod.bind(this),
      openFilePicker: this.openFilePickerLegacy.bind(this),
      openFilePickerV2: this.openFilePicker.bind(this),
      // Legacy
      async callPluginMethod(methodName: string, args = {}) {
        return DeckyBackend.call<[pluginName: string, methodName: string, kwargs: any], any>(
          'loader/call_legacy_plugin_method',
          pluginName,
          methodName,
          args,
        );
      },
      fetchNoCors: this.legacyFetchNoCors.bind(this),
      executeInTab: DeckyBackend.callable<
        [tab: String, runAsync: Boolean, code: string],
        { success: boolean; result: any }
      >('utilities/execute_in_tab'),
      injectCssIntoTab: DeckyBackend.callable<[tab: string, style: string], string>('utilities/inject_css_into_tab'),
      removeCssFromTab: DeckyBackend.callable<[tab: string, cssId: string]>('utilities/remove_css_from_tab'),
    };

    return pluginAPI;
  }
}

export default PluginLoader;
