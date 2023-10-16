import { InstallType, Plugin } from './plugin';
import { getSetting, setSetting } from './utils/settings';

export enum Store {
  Default,
  Testing,
  Custom,
}

export enum SortOptions {
  name = 'name',
  date = 'date',
}

export enum SortDirections {
  ascending = 'asc',
  descending = 'desc',
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

export interface PluginInstallRequest {
  plugin: string;
  selectedVer: StorePluginVersion;
  installType: InstallType;
}

// name: version
export type PluginUpdateMapping = Map<string, StorePluginVersion>;

export async function getStore(): Promise<Store> {
  return await getSetting<Store>('store', Store.Default);
}

export async function getPluginList(
  sort_by: SortOptions | null = null,
  sort_direction: SortDirections | null = null,
): Promise<StorePlugin[]> {
  let version = await window.DeckyPluginLoader.updateVersion();
  let store = await getSetting<Store>('store', Store.Default);
  let customURL = await getSetting<string>('store-url', 'https://plugins.deckbrew.xyz/plugins');

  let query: URLSearchParams | string = new URLSearchParams();
  sort_by && query.set('sort_by', sort_by);
  sort_direction && query.set('sort_direction', sort_direction);
  query = '?' + String(query);

  let storeURL;
  if (!store) {
    console.log('Could not get a default store, using Default.');
    await setSetting('store-url', Store.Default);
    return fetch('https://plugins.deckbrew.xyz/plugins' + query, {
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
    return fetch(storeURL + query, {
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

export async function requestPluginInstall(plugin: string, selectedVer: StorePluginVersion, installType: InstallType) {
  const artifactUrl = selectedVer.artifact ?? pluginUrl(selectedVer.hash);
  await window.DeckyPluginLoader.callServerMethod('install_plugin', {
    name: plugin,
    artifact: artifactUrl,
    version: selectedVer.name,
    hash: selectedVer.hash,
    install_type: installType,
  });
}

export async function requestMultiplePluginInstalls(requests: PluginInstallRequest[]) {
  await window.DeckyPluginLoader.callServerMethod('install_plugins', {
    requests: requests.map(({ plugin, installType, selectedVer }) => ({
      name: plugin,
      artifact: selectedVer.artifact ?? pluginUrl(selectedVer.hash),
      version: selectedVer.name,
      hash: selectedVer.hash,
      install_type: installType,
    })),
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

function pluginUrl(hash: string) {
  return `https://cdn.tzatzikiweeb.moe/file/steam-deck-homebrew/versions/${hash}.zip`;
}
