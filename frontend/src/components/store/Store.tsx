import { SteamSpinner } from 'decky-frontend-lib';
import { FC, useEffect, useState } from 'react';

import PluginCard from './PluginCard';

export interface StorePlugin {
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
  formData.append('artifact', url);
  await fetch('http://localhost:1337/browser/install_plugin', {
    method: 'POST',
    body: formData,
  });
}

export async function requestPluginInstall(plugin: StorePlugin, selectedVer: string) {
  const formData = new FormData();
  formData.append('artifact', `https://github.com/${plugin.artifact}/archive/refs/tags/${selectedVer}.zip`);
  formData.append('version', selectedVer);
  formData.append('hash', plugin.versions[selectedVer]);
  await fetch('http://localhost:1337/browser/install_plugin', {
    method: 'POST',
    body: formData,
  });
}

const StorePage: FC<{}> = () => {
  const [data, setData] = useState<StorePlugin[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('https://beta.deckbrew.xyz/get_plugins', { method: 'GET' }).then((r) => r.json());
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
