import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

import PluginLoader from './plugin-loader';

declare global {
  export var DeckyPluginLoader: PluginLoader;
  export var deckyHasLoaded: boolean;
  export var deckyHasConnectedRDT: boolean | undefined;
  export var deckyAuthToken: string;
  export var DFL: any | undefined;
}

(async () => {
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
          Authentication: deckyAuthToken,
        },
        requestOptions: {
          credentials: 'include',
        },
      },
    });

  window?.DeckyPluginLoader?.dismountAll();
  window?.DeckyPluginLoader?.deinit();
  window.DeckyPluginLoader = new PluginLoader();
  DeckyPluginLoader.init();
  console.log(import.meta.url);
})();

export default i18n;
