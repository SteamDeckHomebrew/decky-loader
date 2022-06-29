import { SteamSpinner } from 'decky-frontend-lib';
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

export async function installFromURL(url: string) {
  const formData = new FormData();
  formData.append('artifact', url);
  await fetch('http://localhost:1337/browser/install_plugin', {
    method: 'POST',
    body: formData,
  });
}

export async function requestPluginInstall(plugin: StorePlugin, selectedVer: StorePluginVersion) {
  const formData = new FormData();
  formData.append('artifact', `https://cdn.tzatzikiweeb.moe/file/steam-deck-homebrew/versions/${selectedVer.hash}.zip`);
  formData.append('version', selectedVer.name);
  formData.append('hash', selectedVer.hash);
  await fetch('http://localhost:1337/browser/install_plugin', {
    method: 'POST',
    body: formData,
  });
}

const StorePage: FC<{}> = () => {
  const [data, setData] = useState<StorePlugin[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('https://beta.deckbrew.xyz/plugins', { method: 'GET' }).then((r) => r.json());
      console.log(res);
      setData(res);
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
        {data === null ? (
          <div style={{ height: '100%' }}>
            <SteamSpinner />
          </div>
        ) : (
          data.map((plugin: StorePlugin) => <PluginCard plugin={plugin} />)
        )}
      </div>
    </div>
  );
};

export default StorePage;
