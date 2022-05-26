import PluginLoader from "./plugin-loader"

declare global {
  interface Window {
    DeckyPluginLoader: PluginLoader;
    importDeckyPlugin: Function;
    syncDeckyPlugins: Function;
  }
}
window.DeckyPluginLoader = new PluginLoader();
window.importDeckyPlugin = function(name: string) {
  window.DeckyPluginLoader?.importPlugin(name);
}
window.syncDeckyPlugins = async function() {
  const plugins = await (await fetch("http://127.0.0.1:1337/plugins")).json();
  for (const plugin of plugins) {
    window.DeckyPluginLoader?.importPlugin(plugin);
  }
}

setTimeout(() => window.syncDeckyPlugins(), 5000);