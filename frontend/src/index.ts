import PluginLoader from './plugin-loader';
import { sleep } from './utils';
import { initModules } from './webpack';

declare global {
  interface Window {
    DeckyPluginLoader?: PluginLoader;
  }
}

if (window.DeckyPluginLoader) {
  window.DeckyPluginLoader?.dismountAll();
}
(async () => {
  while (!window.SP_REACT?.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
    await sleep(10); // need to wait a little for react
  }
  initModules();
  window.DeckyPluginLoader = new PluginLoader();
  setTimeout(async () => {
    window.DeckyPluginLoader?.loadAllPlugins();
  }, 5000);
})();
