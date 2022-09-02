import { ButtonItem, CommonUIModule, webpackCache } from 'decky-frontend-lib';
import { forwardRef } from 'react';

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
    webpackJsonp: any;
  }
}

// HACK to fix plugins using webpack v4 push

const v4Cache = {};
for (let m of Object.keys(webpackCache)) {
  v4Cache[m] = { exports: webpackCache[m] };
}

if (!window.webpackJsonp || window.webpackJsonp.deckyShimmed) {
  window.webpackJsonp = {
    deckyShimmed: true,
    push: (mod: any): any => {
      if (mod[1].get_require) return { c: v4Cache };
    },
  };
  CommonUIModule.__deckyButtonItemShim = forwardRef((props: any, ref: any) => {
    // tricks the old filter into working
    const dummy = `childrenContainerWidth:"min"`;
    return <ButtonItem ref={ref} _shim={dummy} {...props} />;
  });
}

(async () => {
  window.deckyAuthToken = await fetch('http://127.0.0.1:1337/auth/token').then((r) => r.text());

  window.DeckyPluginLoader?.unloadAll();
  window.DeckyPluginLoader?.deinit();

  window.DeckyPluginLoader = new PluginLoader();
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
