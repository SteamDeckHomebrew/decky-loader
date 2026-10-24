import { compare, validate } from 'compare-versions';

import { DisabledPlugin, InstallType, Plugin, installPlugin, installPlugins } from './plugin';
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

export type UpdateEndpointVersions = { [name: string]: [version: string, hash: string, artifact?: string] };

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

export class StoreRequestError extends Error {
  constructor(public readonly status: number) {
    super(`Plugin store request failed (HTTP ${status})`);
    this.name = 'StoreRequestError';
  }
}

export async function getStore(): Promise<Store> {
  return await getSetting<Store>('store', Store.Default);
}

export async function getStoreBaseURL(): Promise<string> {
  let store = await getSetting<Store | null>('store', null);
  let customURL = await getSetting<string>('store-url', 'https://plugins.deckbrew.xyz/plugins');
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
  return storeURL;
}

export async function getPluginList(
  sort_by: SortOptions | null = null,
  sort_direction: SortDirections | null = null,
  signal?: AbortSignal,
): Promise<StorePlugin[]> {
  let query: URLSearchParams | string = new URLSearchParams();
  sort_by && query.set('sort_by', sort_by);
  sort_direction && query.set('sort_direction', sort_direction);
  query = '?' + String(query);

  const data = await getStoreData(query, signal);
  if (!Array.isArray(data)) throw new Error('Plugin store returned an invalid plugin list');
  return data;
}

export async function getVersionList(): Promise<UpdateEndpointVersions> {
  const data = await getStoreData('/versions');
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Plugin store returned an invalid version list');
  }
  return data as UpdateEndpointVersions;
}

async function getStoreData(path: string, signal?: AbortSignal): Promise<unknown> {
  const version = await window.DeckyPluginLoader.updateVersion();
  const storeURL = await getStoreBaseURL();
  const response = await fetch(storeURL + path, {
    method: 'GET',
    signal,
    headers: {
      'X-Decky-Version': version.current,
    },
  });
  if (!response.ok) throw new StoreRequestError(response.status);
  return response.json();
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

export async function checkForPluginUpdates(plugins: (Plugin | DisabledPlugin)[]): Promise<PluginUpdateMapping> {
  const serverData = await getVersionList();
  const updateMap = new Map<string, StorePluginVersion>();
  for (let plugin of plugins) {
    const remotePlugin = serverData?.[plugin.name];
    //FIXME: Ugly hack since plugin.version might be null during evaluation,
    //so this will set the older version possible
    const curVer = plugin.version ? plugin.version : '0.0.0';

    if (
      remotePlugin &&
      plugin.version != remotePlugin[0] &&
      validate(remotePlugin[0]) &&
      validate(curVer) &&
      compare(remotePlugin[0], curVer, '>')
    ) {
      updateMap.set(plugin.name, {
        name: remotePlugin[0],
        hash: remotePlugin[1],
        artifact: remotePlugin[2],
      });
    }
  }
  return updateMap;
}

function pluginUrl(hash: string) {
  return `https://cdn.tzatzikiweeb.moe/file/steam-deck-homebrew/versions/${hash}.zip`;
}
