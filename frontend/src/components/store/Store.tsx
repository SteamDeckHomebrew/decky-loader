import { ModalRoot, SteamSpinner, showModal, staticClasses } from 'decky-frontend-lib';
import { FC, useEffect, useState } from 'react';

import PluginCard from './PluginCard';

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

export async function installFromURL(url: string) {
  const formData = new FormData();
  const splitURL = url.split('/');
  formData.append('name', splitURL[splitURL.length - 1].replace('.zip', ''));
  formData.append('artifact', url);
  await fetch('http://localhost:1337/browser/install_plugin', {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: {
      Authentication: window.deckyAuthToken,
    },
  });
}

export function requestLegacyPluginInstall(plugin: LegacyStorePlugin, selectedVer: string) {
  showModal(
    <ModalRoot
      onOK={() => {
        const formData = new FormData();
        formData.append('name', plugin.artifact);
        formData.append('artifact', `https://github.com/${plugin.artifact}/archive/refs/tags/${selectedVer}.zip`);
        formData.append('version', selectedVer);
        formData.append('hash', plugin.versions[selectedVer]);
        fetch('http://localhost:1337/browser/install_plugin', {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers: {
            Authentication: window.deckyAuthToken,
          },
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
    </ModalRoot>,
  );
}

export async function requestPluginInstall(plugin: StorePlugin, selectedVer: StorePluginVersion) {
  const formData = new FormData();
  formData.append('name', plugin.name);
  formData.append('artifact', `https://cdn.tzatzikiweeb.moe/file/steam-deck-homebrew/versions/${selectedVer.hash}.zip`);
  formData.append('version', selectedVer.name);
  formData.append('hash', selectedVer.hash);
  await fetch('http://localhost:1337/browser/install_plugin', {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: {
      Authentication: window.deckyAuthToken,
    },
  });
}

const StorePage: FC<{}> = () => {
  const [data, setData] = useState<StorePlugin[] | null>(null);
  const [legacyData, setLegacyData] = useState<LegacyStorePlugin[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('https://beta.deckbrew.xyz/plugins', {
        method: 'GET',
      }).then((r) => r.json());
      console.log(res);
      setData(res.filter((x: StorePlugin) => x.name !== 'Example Plugin'));
    })();
    (async () => {
      const res = await fetch('https://plugins.deckbrew.xyz/get_plugins', {
        method: 'GET',
      }).then((r) => r.json());
      console.log(res);
      setLegacyData(res);
    })();
  }, []);

  return (
    <div
      style={{
        marginTop: '40px',
        height: 'calc( 100% - 40px )',
        overflowY: 'scroll',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {!data ? (
          <div style={{ height: '100%' }}>
            <SteamSpinner />
          </div>
        ) : (
          <div>
            {data.map((plugin: StorePlugin) => (
              <PluginCard plugin={plugin} />
            ))}
            {!legacyData ? (
              <SteamSpinner />
            ) : (
              legacyData.map((plugin: LegacyStorePlugin) => <PluginCard plugin={plugin} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StorePage;
