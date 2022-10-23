import { ConfirmModal, showModal, staticClasses } from 'decky-frontend-lib';

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

export interface LegacyStorePlugin {
  artifact: string;
  versions: {
    [version: string]: string;
  };
  author: string;
  description: string;
  tags: string[];
}

// name: version
export type PluginUpdateMapping = Map<string, StorePluginVersion>;

export async function getPluginList(): Promise<StorePlugin[]> {
  let version = await window.DeckyPluginLoader.updateVersion();
  return fetch('https://beta.deckbrew.xyz/plugins', {
    method: 'GET',
    headers: {
      'X-Decky-Version': version.current,
    },
  }).then((r) => r.json());
}

export function getLegacyPluginList(): Promise<LegacyStorePlugin[]> {
  return fetch('https://plugins.deckbrew.xyz/get_plugins', {
    method: 'GET',
  }).then((r) => r.json());
}

export async function installFromURL(url: string) {
  const splitURL = url.split('/');
  await window.DeckyPluginLoader.callServerMethod('install_plugin', {
    name: splitURL[splitURL.length - 1].replace('.zip', ''),
    artifact: url,
  });
}

export function requestLegacyPluginInstall(plugin: LegacyStorePlugin, selectedVer: string) {
  showModal(
    <ConfirmModal
      onOK={() => {
        window.DeckyPluginLoader.callServerMethod('install_plugin', {
          name: plugin.artifact,
          artifact: `https://github.com/${plugin.artifact}/archive/refs/tags/${selectedVer}.zip`,
          version: selectedVer,
          hash: plugin.versions[selectedVer],
        });
      }}
      onCancel={() => {
        // do nothing
      }}
    >
      <div className={staticClasses.Title} style={{ flexDirection: 'column', boxShadow: 'unset' }}>
        Using legacy plugins
      </div>
      You are currently installing a <b>legacy</b> plugin. Legacy plugins are no longer supported and may have issues.
      Legacy plugins do not support gamepad input. To interact with a legacy plugin, you will need to use the
      touchscreen.
    </ConfirmModal>,
  );
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

export function isLegacyPlugin(plugin: LegacyStorePlugin | StorePlugin): plugin is LegacyStorePlugin {
  return 'artifact' in plugin;
}
