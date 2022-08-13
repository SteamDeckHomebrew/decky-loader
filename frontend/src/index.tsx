import { sleep } from 'decky-frontend-lib';

import PluginLoader from './plugin-loader';
import { DeckyUpdater } from './updater';

declare global {
  interface Window {
    DeckyPluginLoader: PluginLoader;
    DeckyUpdater?: DeckyUpdater;
    importDeckyPlugin: Function;
    syncDeckyPlugins: Function;
    deckyHasLoaded: boolean;
    deckyAuthToken: string;
  }
}
(async () => {
  window.deckyHasLoaded = true;
  await sleep(1000);
  window.deckyAuthToken = await fetch('http://127.0.0.1:1337/auth/token').then((r) => r.text());

  window.DeckyPluginLoader?.dismountAll();
  window.DeckyPluginLoader?.deinit();

  window.DeckyPluginLoader = new PluginLoader();
  window.importDeckyPlugin = function (name: string) {
    window.DeckyPluginLoader?.importPlugin(name);
  };

  window.syncDeckyPlugins = async function () {
    const plugins = await (
      await fetch('http://127.0.0.1:1337/plugins', {
        credentials: 'include',
        headers: { Authentication: window.deckyAuthToken },
      })
    ).json();
    for (const plugin of plugins) {
      if (!window.DeckyPluginLoader.hasPlugin(plugin)) window.DeckyPluginLoader?.importPlugin(plugin);
    }
  };

  setTimeout(() => window.syncDeckyPlugins(), 5000);
})();
