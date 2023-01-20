import {
  ButtonItem,
  Dropdown,
  Focusable,
  PanelSectionRow,
  SingleDropdownOption,
  SuspensefulImage,
} from 'decky-frontend-lib';
import { FC, useState } from 'react';

import { StorePlugin, StorePluginVersion, requestPluginInstall } from '../../store';

interface PluginCardProps {
  plugin: StorePlugin;
}

const PluginCard: FC<PluginCardProps> = ({ plugin }) => {
  const [selectedOption, setSelectedOption] = useState<number>(0);
  const root: boolean = plugin.tags.some((tag) => tag === 'root');

  return (
    <div
      className="deckyStoreCard"
      style={{
        marginLeft: '20px',
        marginRight: '20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        className="deckyStoreCardImageContainer"
        style={{
          width: '320px',
          height: '200px',
          position: 'relative',
        }}
      >
        <SuspensefulImage
          className="deckyStoreCardImage"
          suspenseHeight="200px"
          suspenseWidth="320px"
          style={{
            width: '320px',
            height: '200px',
            objectFit: 'cover',
          }}
          src={plugin.image_url}
        />
      </div>
      <div
        className="deckyStoreCardInfo"
        style={{
          width: 'calc(100% - 320px)', // The calc is here so that the info section doesn't expand into the image
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          marginLeft: '1em',
          justifyContent: 'center',
        }}
      >
        <span
          className="deckyStoreCardTitle"
          style={{
            fontSize: '1.25em',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '90%',
          }}
        >
          {plugin.name}
        </span>
        <span
          className="deckyStoreCardAuthor"
          style={{
            marginRight: 'auto',
            fontSize: '1em',
          }}
        >
          {plugin.author}
        </span>
        <span
          className="deckyStoreCardDescription"
          style={{
            fontSize: '13px',
            color: '#969696',
            WebkitLineClamp: root ? '2' : '3',
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            display: '-webkit-box',
          }}
        >
          {plugin.description ? (
            plugin.description
          ) : (
            <span>
              <i style={{ color: '#666' }}>No description provided.</i>
            </span>
          )}
        </span>
        {root && (
          <span
            className="deckyStoreCardDescription deckyStoreCardDescriptionRoot"
            style={{
              fontSize: '13px',
              color: '#fee75c',
            }}
          >
            <i>This plugin has full access to your Steam Deck.</i>{' '}
            <a
              className="deckyStoreCardDescriptionRootLink"
              href="https://deckbrew.xyz/root"
              target="_blank"
              style={{
                color: '#fee75c',
                textDecoration: 'none',
              }}
            >
              deckbrew.xyz/root
            </a>
          </span>
        )}
        <div
          className="deckyStoreCardButtonRow"
          style={{
            marginTop: '1em',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <PanelSectionRow>
            <Focusable style={{ display: 'flex', maxWidth: '100%' }}>
              <div
                className="deckyStoreCardInstallContainer"
                style={{
                  paddingTop: '0px',
                  paddingBottom: '0px',
                  width: '40%',
                }}
              >
                <ButtonItem
                  bottomSeparator="none"
                  layout="below"
                  onClick={() => requestPluginInstall(plugin.name, plugin.versions[selectedOption])}
                >
                  <span className="deckyStoreCardInstallText">Install</span>
                </ButtonItem>
              </div>
              <div
                className="deckyStoreCardVersionContainer"
                style={{
                  marginLeft: '5%',
                  width: '30%',
                }}
              >
                <Dropdown
                  rgOptions={
                    plugin.versions.map((version: StorePluginVersion, index) => ({
                      data: index,
                      label: version.name,
                    })) as SingleDropdownOption[]
                  }
                  menuLabel="Plugin Version"
                  selectedOption={selectedOption}
                  onChange={({ data }) => setSelectedOption(data)}
                />
              </div>
            </Focusable>
          </PanelSectionRow>
        </div>
      </div>
    </div>
  );
};

export default PluginCard;
