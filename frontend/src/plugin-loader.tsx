import {
  ModalRoot,
  PanelSection,
  PanelSectionRow,
  Patch,
  QuickAccessTab,
  Router,
  findSP,
  quickAccessMenuClasses,
  showModal,
  sleep,
} from 'decky-frontend-lib';
import { FC, lazy } from 'react';
import { FaExclamationCircle, FaPlug } from 'react-icons/fa';

import { DeckyState, DeckyStateContextProvider, UserInfo, useDeckyState } from './components/DeckyState';
import { File, FileSelectionType } from './components/modals/filepicker';
import { deinitFilepickerPatches, initFilepickerPatches } from './components/modals/filepicker/patches';
import MultiplePluginsInstallModal from './components/modals/MultiplePluginsInstallModal';
import PluginInstallModal from './components/modals/PluginInstallModal';
import PluginUninstallModal from './components/modals/PluginUninstallModal';
import NotificationBadge from './components/NotificationBadge';
import PluginView from './components/PluginView';
import WithSuspense from './components/WithSuspense';
import { HiddenPluginsService } from './hidden-plugins-service';
import Logger from './logger';
import { NotificationService } from './notification-service';
import { InstallType, Plugin } from './plugin';
import RouterHook from './router-hook';
import { deinitSteamFixes, initSteamFixes } from './steamfixes';
import { checkForUpdates } from './store';
import TabsHook from './tabs-hook';
import OldTabsHook from './tabs-hook.old';
import Toaster from './toaster';
import { VerInfo, callUpdaterMethod } from './updater';
import { getSetting, setSetting } from './utils/settings';
import TranslationHelper, { TranslationClass } from './utils/TranslationHelper';

const StorePage = lazy(() => import('./components/store/Store'));
const SettingsPage = lazy(() => import('./components/settings'));

const FilePicker = lazy(() => import('./components/modals/filepicker'));

class PluginLoader extends Logger {
  private plugins: Plugin[] = [];
  private tabsHook: TabsHook | OldTabsHook = document.title == 'SP' ? new OldTabsHook() : new TabsHook();
  // private windowHook: WindowHook = new WindowHook();
  private routerHook: RouterHook = new RouterHook();
  public toaster: Toaster = new Toaster();
  private deckyState: DeckyState = new DeckyState();

  public hiddenPluginsService = new HiddenPluginsService(this.deckyState);
  public notificationService = new NotificationService(this.deckyState);

  private reloadLock: boolean = false;
  // stores a list of plugin names which requested to be reloaded
  private pluginReloadQueue: { name: string; version?: string }[] = [];

  private focusWorkaroundPatch?: Patch;

  constructor() {
    super(PluginLoader.name);
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
      <WithSuspense route={true}>
        <StorePage />
      </WithSuspense>
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

    Promise.all([this.getUserInfo(), this.updateVersion()])
      .then(() => this.loadPlugins())
      .then(() => this.checkPluginUpdates())
      .then(() => this.log('Initialized'));
  }

  private getPluginsFromBackend = window.DeckyBackend.callable<[], { name: string; version: string }[]>(
    'loader/get_plugins',
  );

  private async loadPlugins() {
    // wait for SP window to exist before loading plugins
    while (!findSP()) {
      await sleep(100);
    }
    const plugins = await this.getPluginsFromBackend();
    const pluginLoadPromises = [];
    const loadStart = performance.now();
    for (const plugin of plugins) {
      if (!this.hasPlugin(plugin.name)) pluginLoadPromises.push(this.importPlugin(plugin.name, plugin.version, false));
    }
    await Promise.all(pluginLoadPromises);
    const loadEnd = performance.now();
    this.log(`Loaded ${plugins.length} plugins in ${loadEnd - loadStart}ms`);

    this.checkPluginUpdates();
  }

  public async getUserInfo() {
    const userInfo = await window.DeckyBackend.call<[], UserInfo>('utilities/get_user_info');
    setSetting('user_info.user_name', userInfo.username);
    setSetting('user_info.user_home', userInfo.path);
  }

  public async updateVersion() {
    const versionInfo = (await callUpdaterMethod('get_version')).result as VerInfo;
    this.deckyState.setVersionInfo(versionInfo);

    return versionInfo;
  }

  public async notifyUpdates() {
    const versionInfo = await this.updateVersion();
    if (versionInfo?.remote && versionInfo?.remote?.tag_name != versionInfo?.current) {
      this.deckyState.setHasLoaderUpdate(true);
      if (this.notificationService.shouldNotify('deckyUpdates')) {
        this.toaster.toast({
          title: <TranslationHelper trans_class={TranslationClass.PLUGIN_LOADER} trans_text="decky_title" />,
          body: (
            <TranslationHelper
              trans_class={TranslationClass.PLUGIN_LOADER}
              trans_text="decky_update_available"
              i18n_args={{ tag_name: versionInfo?.remote?.tag_name }}
            />
          ),
          onClick: () => Router.Navigate('/decky/settings'),
        });
      }
    }
    await sleep(7000);
    await this.notifyPluginUpdates();
  }

  public async checkPluginUpdates() {
    const updates = await checkForUpdates(this.plugins);
    this.deckyState.setUpdates(updates);
    return updates;
  }

  public async notifyPluginUpdates() {
    const updates = await this.checkPluginUpdates();
    if (updates?.size > 0 && this.notificationService.shouldNotify('pluginUpdates')) {
      this.toaster.toast({
        title: <TranslationHelper trans_class={TranslationClass.PLUGIN_LOADER} trans_text="decky_title" />,
        body: (
          <TranslationHelper
            trans_class={TranslationClass.PLUGIN_LOADER}
            trans_text="plugin_update"
            i18n_args={{ count: updates.size }}
          />
        ),
        onClick: () => Router.Navigate('/decky/settings/plugins'),
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
        onOK={() => window.DeckyBackend.call<[string]>('utilities/confirm_plugin_install', request_id)}
        onCancel={() => window.DeckyBackend.call<[string]>('utilities/cancel_plugin_install', request_id)}
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
        onOK={() => window.DeckyBackend.call<[string]>('utilities/confirm_plugin_install', request_id)}
        onCancel={() => window.DeckyBackend.call<[string]>('utilities/cancel_plugin_install', request_id)}
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

    this.hiddenPluginsService.init();
    this.notificationService.init();
  }

  public deinit() {
    this.routerHook.removeRoute('/decky/store');
    this.routerHook.removeRoute('/decky/settings');
    deinitSteamFixes();
    deinitFilepickerPatches();
    this.focusWorkaroundPatch?.unpatch();
  }

  public unloadPlugin(name: string) {
    const plugin = this.plugins.find((plugin) => plugin.name === name);
    plugin?.onDismount?.();
    this.plugins = this.plugins.filter((p) => p !== plugin);
    this.deckyState.setPlugins(this.plugins);
  }

  public async importPlugin(name: string, version?: string | undefined, useQueue: boolean = true) {
    if (useQueue && this.reloadLock) {
      this.log('Reload currently in progress, adding to queue', name);
      this.pluginReloadQueue.push({ name, version: version });
      return;
    }

    try {
      this.reloadLock = true;
      this.log(`Trying to load ${name}`);

      this.unloadPlugin(name);
      const startTime = performance.now();
      await this.importReactPlugin(name, version);
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
          this.importPlugin(nextPlugin.name, nextPlugin.version);
        }
      }
    }
  }

  private async importReactPlugin(name: string, version?: string) {
    let res = await fetch(`http://127.0.0.1:1337/plugins/${name}/frontend_bundle`, {
      credentials: 'include',
      headers: {
        Authentication: window.deckyAuthToken,
      },
    });

    if (res.ok) {
      try {
        let plugin_export = await eval(await res.text());
        let plugin = plugin_export(this.createPluginAPI(name));
        this.plugins.push({
          ...plugin,
          name: name,
          version: version,
        });
      } catch (e) {
        this.error('Error loading plugin ' + name, e);
        const TheError: FC<{}> = () => (
          <PanelSection>
            <PanelSectionRow>
              <div
                className={quickAccessMenuClasses.FriendsTitle}
                style={{ display: 'flex', justifyContent: 'center' }}
              >
                <TranslationHelper trans_class={TranslationClass.PLUGIN_LOADER} trans_text="error" />
              </div>
            </PanelSectionRow>
            <PanelSectionRow>
              <pre style={{ overflowX: 'scroll' }}>
                <code>{e instanceof Error ? e.stack : JSON.stringify(e)}</code>
              </pre>
            </PanelSectionRow>
            <PanelSectionRow>
              <div className={quickAccessMenuClasses.Text}>
                <TranslationHelper
                  trans_class={TranslationClass.PLUGIN_LOADER}
                  trans_text="plugin_error_uninstall"
                  i18n_args={{ name: name }}
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
        });
        this.toaster.toast({
          title: (
            <TranslationHelper
              trans_class={TranslationClass.PLUGIN_LOADER}
              trans_text="plugin_load_error.toast"
              i18n_args={{ name: name }}
            />
          ),
          body: '' + e,
          icon: <FaExclamationCircle />,
        });
      }
    } else throw new Error(`${name} frontend_bundle not OK`);
  }

  async callServerMethod(methodName: string, args = {}) {
    this.warn(
      `Calling ${methodName} via callServerMethod, which is deprecated and will be removed in a future release. Please switch to the backend API.`,
    );
    return await window.DeckyBackend.call<[methodName: string, kwargs: any], any>(
      'utilities/_call_legacy_utility',
      methodName,
      args,
    );
  }

  openFilePicker(
    startPath: string,
    selectFiles?: boolean,
    regex?: RegExp,
  ): Promise<{ path: string; realpath: string }> {
    this.warn('openFilePicker is deprecated and will be removed. Please migrate to openFilePickerV2');
    if (selectFiles) {
      return this.openFilePickerV2(FileSelectionType.FILE, startPath, true, true, regex);
    } else {
      return this.openFilePickerV2(FileSelectionType.FOLDER, startPath, false, true, regex);
    }
  }

  openFilePickerV2(
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

  createPluginAPI(pluginName: string) {
    const pluginAPI = {
      backend: {
        call<Args extends any[] = any[], Return = void>(method: string, ...args: Args): Promise<Return> {
          return window.DeckyBackend.call<[pluginName: string, method: string, ...args: Args], Return>(
            'loader/call_plugin_method',
            pluginName,
            method,
            ...args,
          );
        },
        callable<Args extends any[] = any[], Return = void>(method: string): (...args: Args) => Promise<Return> {
          return (...args) => pluginAPI.backend.call<Args, Return>(method, ...args);
        },
      },
      routerHook: this.routerHook,
      toaster: this.toaster,
      // Legacy
      callServerMethod: this.callServerMethod,
      openFilePicker: this.openFilePicker,
      openFilePickerV2: this.openFilePickerV2,
      // Legacy
      async callPluginMethod(methodName: string, args = {}) {
        return window.DeckyBackend.call<[pluginName: string, methodName: string, kwargs: any], any>(
          'loader/call_legacy_plugin_method',
          pluginName,
          methodName,
          args,
        );
      },
      /* TODO replace with the following flow (or similar) so we can reuse the JS Fetch API
        frontend --request URL only--> backend (ws method)
        backend --new temporary backend URL--> frontend (ws response)
        frontend <--> backend <--> target URL (over http!)
      */
      async fetchNoCors(url: string, request: any = {}) {
        let method: string;
        const req = { headers: {}, ...request, data: request.body };
        req?.body && delete req.body;
        if (!request.method) {
          method = 'POST';
        } else {
          method = request.method;
          delete req.method;
        }
        // this is terrible but a. we're going to redo this entire method anyway and b. it was already terrible
        try {
          const ret = await window.DeckyBackend.call<
            [method: string, url: string, extra_opts?: any],
            { status: number; headers: { [key: string]: string }; body: string }
          >('utilities/http_request', method, url, req);
          return { success: true, result: ret };
        } catch (e) {
          return { success: false, result: e?.toString() };
        }
      },
      executeInTab: window.DeckyBackend.callable<
        [tab: String, runAsync: Boolean, code: string],
        { success: boolean; result: any }
      >('utilities/execute_in_tab'),
      injectCssIntoTab: window.DeckyBackend.callable<[tab: string, style: string], string>(
        'utilities/inject_css_into_tab',
      ),
      removeCssFromTab: window.DeckyBackend.callable<[tab: string, cssId: string]>('utilities/remove_css_from_tab'),
    };

    return pluginAPI;
  }
}

export default PluginLoader;
