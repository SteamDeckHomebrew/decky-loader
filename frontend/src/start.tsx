import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

import PluginLoader from './plugin-loader';
import { DeckyUpdater } from './updater';

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
  window.deckyAuthToken = await fetch('http://127.0.0.1:1337/auth/token').then((r) => r.text());

  i18n
    .use(Backend)
    .use(initReactI18next)
    .init({
      load: 'currentOnly',
      detection: {
        order: ['querystring', 'navigator'],
        lookupQuerystring: 'lng',
      },
      //debug: true,
      lng: navigator.language,
      fallbackLng: 'en-US',
      interpolation: {
        escapeValue: true,
      },
      returnEmptyString: false,
      backend: {
        loadPath: 'http://127.0.0.1:1337/locales/{{lng}}.json',
        customHeaders: {
          Authentication: window.deckyAuthToken,
        },
        requestOptions: {
          credentials: 'include',
        },
      },
    });

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

    window.DeckyPluginLoader.checkPluginUpdates();
  };

  setTimeout(() => window.syncDeckyPlugins(), 5000);
})();

export default i18n;
