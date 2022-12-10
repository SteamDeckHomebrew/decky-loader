import { Plugin } from './plugin';
import { getSetting, setSetting } from './utils/settings';

export enum Store {
  Default,
  Testing,
  Custom,
}

export interface StorePluginVersion {
  name: string;
  hash: string;
  artifact: string | undefined | null;
}

export interface StorePlugin {
  id: number;
  name: string;
  versions: StorePluginVersion[];
  author: string;
  description: string;
  tags: string[];
  image_url: string;
}

// name: version
export type PluginUpdateMapping = Map<string, StorePluginVersion>;

export async function getPluginList(): Promise<StorePlugin[]> {
  let version = await window.DeckyPluginLoader.updateVersion();
  let store = await getSetting<Store>('store', Store.Default);
  let customURL = await getSetting<string>('store-url', 'https://plugins.deckbrew.xyz/plugins');
  let storeURL;
  if (!store) {
    console.log('Could not get a default store, using Default.');
    await setSetting('store-url', Store.Default);
    return fetch('https://plugins.deckbrew.xyz/plugins', {
      method: 'GET',
      headers: {
        'X-Decky-Version': version.current,
      },
    }).then((r) => r.json());
  } else {
    switch (+store) {
      case Store.Default:
        storeURL = 'https://plugins.deckbrew.xyz/plugins';
        break;
      case Store.Testing:
        storeURL = 'https://testing.deckbrew.xyz/plugins';
        break;
      case Store.Custom:
        storeURL = customURL;
        break;
      default:
        console.error('Somehow you ended up without a standard URL, using the default URL.');
        storeURL = 'https://plugins.deckbrew.xyz/plugins';
        break;
    }
    return fetch(storeURL, {
      method: 'GET',
      headers: {
        'X-Decky-Version': version.current,
      },
    }).then((r) => r.json());
  }
}

export async function installFromURL(url: string) {
  const splitURL = url.split('/');
  await window.DeckyPluginLoader.callServerMethod('install_plugin', {
    name: splitURL[splitURL.length - 1].replace('.zip', ''),
    artifact: url,
  });
}

export async function requestPluginInstall(plugin: string, selectedVer: StorePluginVersion) {
  const artifactUrl =
    selectedVer.artifact ?? `https://cdn.tzatzikiweeb.moe/file/steam-deck-homebrew/versions/${selectedVer.hash}.zip`;
  await window.DeckyPluginLoader.callServerMethod('install_plugin', {
    name: plugin,
    artifact: artifactUrl,
    version: selectedVer.name,
    hash: selectedVer.hash,
  });
}

export async function checkForUpdates(plugins: Plugin[]): Promise<PluginUpdateMapping> {
  const serverData = await getPluginList();
  const updateMap = new Map<string, StorePluginVersion>();
  for (let plugin of plugins) {
    const remotePlugin = serverData?.find((x) => x.name == plugin.name);
    if (remotePlugin && remotePlugin.versions?.length > 0 && plugin.version != remotePlugin?.versions?.[0]?.name) {
      updateMap.set(plugin.name, remotePlugin.versions[0]);
    }
  }
  return updateMap;
}
