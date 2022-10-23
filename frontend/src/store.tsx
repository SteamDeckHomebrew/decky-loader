import { Plugin } from './plugin';

export interface StorePluginVersion {
  name: string;
  hash: string;
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
  return fetch('https://plugins.deckbrew.xyz/plugins', {
    method: 'GET',
    headers: {
      'X-Decky-Version': version.current,
    },
  }).then((r) => r.json());
}

export async function installFromURL(url: string) {
  const splitURL = url.split('/');
  await window.DeckyPluginLoader.callServerMethod('install_plugin', {
    name: splitURL[splitURL.length - 1].replace('.zip', ''),
    artifact: url,
  });
}

export async function requestPluginInstall(plugin: string, selectedVer: StorePluginVersion) {
  await window.DeckyPluginLoader.callServerMethod('install_plugin', {
    name: plugin,
    artifact: `https://cdn.tzatzikiweeb.moe/file/steam-deck-homebrew/versions/${selectedVer.hash}.zip`,
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
