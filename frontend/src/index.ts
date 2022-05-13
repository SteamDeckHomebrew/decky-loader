import PluginLoader from './plugin-loader';

declare global {
  interface Window {
    DeckyPluginLoader?: PluginLoader;
  }
}

if (window.DeckyPluginLoader) {
  window.DeckyPluginLoader?.dismountAll();
}

window.DeckyPluginLoader = new PluginLoader();
setTimeout(async () => {
  window.DeckyPluginLoader?.loadAllPlugins();
}, 5000);
