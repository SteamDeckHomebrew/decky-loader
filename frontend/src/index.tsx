import { Navigation, Router, sleep } from 'decky-frontend-lib';

import { useDeckyState } from './components/DeckyState';
import { Plugin } from './plugin';
import PluginLoader from './plugin-loader';
import { DeckyUpdater } from './updater';
import { useSetting } from './utils/hooks/useSetting';

declare global {
  interface Window {
    DeckyPluginLoader: PluginLoader;
    DeckyUpdater?: DeckyUpdater;
    importDeckyPlugin: Function;
    syncDeckyPlugins: Function;
    deckyHasLoaded: boolean;
    deckyHasConnectedRDT?: boolean;
    deckyAuthToken: string;
    DFL?: any;
  }
}

(async () => {
  try {
    if (!Router.NavigateToAppProperties || !Router.NavigateToLibraryTab || !Router.NavigateToInvites) {
      while (!Navigation.NavigateToAppProperties) await sleep(100);
      const shims = {
        NavigateToAppProperties: Navigation.NavigateToAppProperties,
        NavigateToInvites: Navigation.NavigateToInvites,
        NavigateToLibraryTab: Navigation.NavigateToLibraryTab,
      };
      (Router as unknown as any).deckyShim = true;
      Object.assign(Router, shims);
    }
  } catch (e) {
    console.error('[DECKY]: Error initializing Navigation interface shims', e);
  }
})();

(async () => {
  window.deckyAuthToken = await fetch('http://127.0.0.1:1337/auth/token').then((r) => r.text());

  window.DeckyPluginLoader?.dismountAll();
  window.DeckyPluginLoader?.deinit();

  window.DeckyPluginLoader = new PluginLoader();
  window.DeckyPluginLoader.init();
  window.importDeckyPlugin = function (name: string, version: string) {
    window.DeckyPluginLoader?.importPlugin(name, version);
  };

  window.syncDeckyPlugins = async function () {
    const plugins = await (
      await fetch('http://127.0.0.1:1337/plugins', {
        credentials: 'include',
        headers: { Authentication: window.deckyAuthToken },
      })
    ).json();
    for (const plugin of plugins) {
      if (!window.DeckyPluginLoader.hasPlugin(plugin.name))
        window.DeckyPluginLoader?.importPlugin(plugin.name, plugin.version);
    }

    //* Grab and set plugin order
    const [getPluginOrderSetting, _] = useSetting<string[]>(
      'pluginOrder',
      plugins.map((plugin: Plugin) => plugin.name),
    );
    const { setPluginOrder } = useDeckyState();
    setPluginOrder(getPluginOrderSetting);

    window.DeckyPluginLoader.checkPluginUpdates();
  };

  setTimeout(() => window.syncDeckyPlugins(), 5000);
})();
