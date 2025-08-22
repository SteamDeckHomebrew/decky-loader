import { compare } from 'compare-versions';

import { InstallType, Plugin, installPlugin, installPlugins } from './plugin';
import { getSetting, setSetting } from './utils/settings';

export enum Store {
  Default,
  Testing,
  Custom,
}

export enum SortOptions {
  name = 'name',
  date = 'date',
  downloads = 'downloads',
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

export interface Announcement {
  id: string;
  title: string;
  text: string;
  created: string;
  updated: string;
}

// name: version
export type PluginUpdateMapping = Map<string, StorePluginVersion>;

export async function getStore(): Promise<Store> {
  return await getSetting<Store>('store', Store.Default);
}

export async function getAnnouncements(): Promise<Announcement[]> {
  let version = await window.DeckyPluginLoader.updateVersion();
  let store = await getSetting<Store | null>('store', null);
  let customURL = await getSetting<string>(
    'announcements-url',
    'https://plugins.deckbrew.xyz/v1/announcements/-/current',
  );

  if (store === null) {
    console.log('Could not get store, using Default.');
    await setSetting('store', Store.Default);
    store = Store.Default;
  }

  let resolvedURL;
  switch (store) {
    case Store.Default:
      resolvedURL = 'https://plugins.deckbrew.xyz/v1/announcements/-/current';
      break;
    case Store.Testing:
      resolvedURL = 'https://testing.deckbrew.xyz/v1/announcements/-/current';
      break;
    case Store.Custom:
      resolvedURL = customURL;
      break;
    default:
      console.error('Somehow you ended up without a standard URL, using the default URL.');
      resolvedURL = 'https://plugins.deckbrew.xyz/v1/announcements/-/current';
      break;
  }
  const res = await fetch(resolvedURL, {
    method: 'GET',
    headers: {
      'X-Decky-Version': version.current,
    },
  });
  if (res.status !== 200) return [];
  const json = await res.json();
  return json ?? [];
}

export async function getPluginList(
  sort_by: SortOptions | null = null,
  sort_direction: SortDirections | null = null,
): Promise<StorePlugin[]> {
  let version = await window.DeckyPluginLoader.updateVersion();
  let store = await getSetting<Store | null>('store', null);
  let customURL = await getSetting<string>('store-url', 'https://plugins.deckbrew.xyz/plugins');

  let query: URLSearchParams | string = new URLSearchParams();
  sort_by && query.set('sort_by', sort_by);
  sort_direction && query.set('sort_direction', sort_direction);
  query = '?' + String(query);

  let storeURL;
  if (store === null) {
    console.log('Could not get store, using Default.');
    await setSetting('store', Store.Default);
    store = Store.Default;
  }
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

export async function installFromURL(url: string) {
  const splitURL = url.split('/');
  await installPlugin(url, splitURL[splitURL.length - 1].replace('.zip', ''));
}

export async function requestPluginInstall(plugin: string, selectedVer: StorePluginVersion, installType: InstallType) {
  const artifactUrl = selectedVer.artifact ?? pluginUrl(selectedVer.hash);
  await installPlugin(artifactUrl, plugin, selectedVer.name, selectedVer.hash, installType);
}

export async function requestMultiplePluginInstalls(requests: PluginInstallRequest[]) {
  await installPlugins(
    requests.map(({ plugin, installType, selectedVer }) => ({
      name: plugin,
      artifact: selectedVer.artifact ?? pluginUrl(selectedVer.hash),
      version: selectedVer.name,
      hash: selectedVer.hash,
      install_type: installType,
    })),
  );
}

export async function checkForPluginUpdates(plugins: Plugin[]): Promise<PluginUpdateMapping> {
  const serverData = await getPluginList();
  const updateMap = new Map<string, StorePluginVersion>();
  for (let plugin of plugins) {
    const remotePlugin = serverData?.find((x) => x.name == plugin.name);
    //FIXME: Ugly hack since plugin.version might be null during evaluation,
    //so this will set the older version possible
    const curVer = plugin.version ? plugin.version : '0.0';
    if (
      remotePlugin &&
      remotePlugin.versions?.length > 0 &&
      plugin.version != remotePlugin?.versions?.[0]?.name &&
      compare(remotePlugin?.versions?.[0]?.name, curVer, '>')
    ) {
      updateMap.set(plugin.name, remotePlugin.versions[0]);
    }
  }
  return updateMap;
}

function pluginUrl(hash: string) {
  return `https://cdn.tzatzikiweeb.moe/file/steam-deck-homebrew/versions/${hash}.zip`;
}
