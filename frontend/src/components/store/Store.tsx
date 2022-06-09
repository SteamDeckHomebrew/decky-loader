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
      {/* BUTTON LAYOUT HACK */}
      <style scoped={true}>
        {`
                .deckyStoreButtons > div {
                    flex: 1;
                    padding-top: 0 !important;
                    padding-bottom: 0 !important;
                }

                .deckyStoreButtons > div > div > div {
                    --controls-list-spacing: 0px !important;
                }

                .deckyStoreButtons > div > div > div > div {
                    max-width: unset !important;
                }

                .deckyStoreButtons > div > div > div > :nth-child(2) {
                    flex-grow: 0;
                }
            `}
      </style>
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
