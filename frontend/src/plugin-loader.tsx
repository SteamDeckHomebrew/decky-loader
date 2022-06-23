import { ModalRoot, QuickAccessTab, showModal, staticClasses } from 'decky-frontend-lib';
import { FaPlug } from 'react-icons/fa';

import { DeckyState, DeckyStateContextProvider } from './components/DeckyState';
import LegacyPlugin from './components/LegacyPlugin';
import PluginView from './components/PluginView';
import SettingsPage from './components/settings';
import StorePage from './components/store/Store';
import TitleView from './components/TitleView';
import Logger from './logger';
import { Plugin } from './plugin';
import RouterHook from './router-hook';
import TabsHook from './tabs-hook';

declare global {
  interface Window {}
}

class PluginLoader extends Logger {
  private plugins: Plugin[] = [];
  private tabsHook: TabsHook = new TabsHook();
  // private windowHook: WindowHook = new WindowHook();
  private routerHook: RouterHook = new RouterHook();
  private deckyState: DeckyState = new DeckyState();

  private reloadLock: boolean = false;
  // stores a list of plugin names which requested to be reloaded
  private pluginReloadQueue: string[] = [];

  constructor() {
    super(PluginLoader.name);
    this.log('Initialized');

    this.tabsHook.add({
      id: QuickAccessTab.Decky,
      title: null,
      content: (
        <DeckyStateContextProvider deckyState={this.deckyState}>
          <TitleView />
          <PluginView />
        </DeckyStateContextProvider>
      ),
      icon: <FaPlug />,
    });

    this.routerHook.addRoute('/decky/store', () => <StorePage />);
    this.routerHook.addRoute('/decky/settings', () => <SettingsPage />);
  }

  public addPluginInstallPrompt(artifact: string, version: string, request_id: string, hash: string) {
    showModal(
      <ModalRoot
        onOK={() => {
          this.callServerMethod('confirm_plugin_install', { request_id });
        }}
        onCancel={() => {
          this.callServerMethod('cancel_plugin_install', { request_id });
        }}
      >
        <div className={staticClasses.Title} style={{ flexDirection: 'column' }}>
          {hash == 'False' ? <h1 style={{ color: 'red' }}>!!!!NO HASH PROVIDED!!!!</h1> : null}
          Install {artifact}
          {version ? ' version ' + version : null}?
        </div>
      </ModalRoot>,
    );
  }

  public dismountAll() {
    for (const plugin of this.plugins) {
      this.log(`Dismounting ${plugin.name}`);
      plugin.onDismount?.();
    }
  }

  public deinit() {
    this.routerHook.removeRoute('/decky/store');
    this.routerHook.removeRoute('/decky/settings');
  }

  public async importPlugin(name: string) {
    if (this.reloadLock) {
      this.log('Reload currently in progress, adding to queue', name);
      this.pluginReloadQueue.push(name);
      return;
    }

    try {
      this.reloadLock = true;
      this.log(`Trying to load ${name}`);

      const oldPlugin = this.plugins.find((plugin) => plugin.name === name);
      if (oldPlugin) {
        oldPlugin.onDismount?.();
        this.plugins = this.plugins.filter((plugin) => plugin !== oldPlugin);
      }

      if (name.startsWith('$LEGACY_')) {
        await this.importLegacyPlugin(name.replace('$LEGACY_', ''));
      } else {
        await this.importReactPlugin(name);
      }

      this.deckyState.setPlugins(this.plugins);
      this.log(`Loaded ${name}`);
    } catch (e) {
      throw e;
    } finally {
      this.reloadLock = false;
      const nextPlugin = this.pluginReloadQueue.shift();
      if (nextPlugin) {
        this.importPlugin(nextPlugin);
      }
    }
  }

  private async importReactPlugin(name: string) {
    let res = await fetch(`http://127.0.0.1:1337/plugins/${name}/frontend_bundle`);
    if (res.ok) {
      let plugin = await eval(await res.text())(this.createPluginAPI(name));
      this.plugins.push({
        ...plugin,
        name: name,
      });
    } else throw new Error(`${name} frontend_bundle not OK`);
  }

  private async importLegacyPlugin(name: string) {
    const url = `http://127.0.0.1:1337/plugins/load_main/${name}`;
    this.plugins.push({
      name: name,
      icon: <FaPlug />,
      content: <LegacyPlugin url={url} />,
    });
  }

  async callServerMethod(methodName: string, args = {}) {
    const response = await fetch(`http://127.0.0.1:1337/methods/${methodName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });

    return response.json();
  }

  createPluginAPI(pluginName: string) {
    return {
      routerHook: this.routerHook,
      callServerMethod: this.callServerMethod,
      async callPluginMethod(methodName: string, args = {}) {
        const response = await fetch(`http://127.0.0.1:1337/plugins/${pluginName}/methods/${methodName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            args,
          }),
        });

        return response.json();
      },
      fetchNoCors(url: string, request: any = {}) {
        let args = { method: 'POST', headers: {}, body: '' };
        const req = { ...args, ...request, url, data: request.body };
        return this.callServerMethod('http_request', req);
      },
      executeInTab(tab: string, runAsync: boolean, code: string) {
        return this.callServerMethod('execute_in_tab', {
          tab,
          run_async: runAsync,
          code,
        });
      },
      injectCssIntoTab(tab: string, style: string) {
        return this.callServerMethod('inject_css_into_tab', {
          tab,
          style,
        });
      },
      removeCssFromTab(tab: string, cssId: any) {
        return this.callServerMethod('remove_css_from_tab', {
          tab,
          css_id: cssId,
        });
      },
    };
  }
}

export default PluginLoader;
