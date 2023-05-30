import {
  ButtonItem,
  Dropdown,
  Focusable,
  PanelSectionRow,
  SingleDropdownOption,
  SuspensefulImage,
} from 'decky-frontend-lib';
import { CSSProperties, FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InstallType } from '../../plugin';
import { StorePlugin, StorePluginVersion, requestPluginInstall } from '../../store';

interface PluginCardProps {
  plugin: StorePlugin;
}

const PluginCard: FC<PluginCardProps> = ({ plugin }) => {
  const [selectedOption, setSelectedOption] = useState<number>(0);
  const root = plugin.tags.some((tag) => tag === 'root');

  const { t } = useTranslation();

  return (
    <div
      className="deckyStoreCard"
      style={{
        marginLeft: '20px',
        marginRight: '20px',
        marginBottom: '20px',
        display: 'flex',
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
          justifyContent: 'space-between',
          marginLeft: '1em',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                <i style={{ color: '#666' }}>{t('PluginCard.plugin_no_desc')}</i>
              </span>
            )}
          </span>
          {root && (
            <div
              className="deckyStoreCardDescription deckyStoreCardDescriptionRoot"
              style={{
                fontSize: '13px',
                color: '#fee75c',
                marginTop: 'auto',
              }}
            >
              <i>{t('PluginCard.plugin_full_access')}</i>{' '}
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
            </div>
          )}
        </div>
        <div className="deckyStoreCardButtonRow">
          <PanelSectionRow>
            <Focusable style={{ display: 'flex', gap: '5px', padding: 0 }}>
              <div
                className="deckyStoreCardInstallContainer"
                style={
                  {
                    paddingTop: '0px',
                    paddingBottom: '0px',
                    flexGrow: 1,
                    '--field-negative-horizontal-margin': 0,
                  } as CSSProperties
                }
              >
                <ButtonItem
                  bottomSeparator="none"
                  layout="below"
                  onClick={() =>
                    requestPluginInstall(plugin.name, plugin.versions[selectedOption], InstallType.INSTALL)
                  }
                >
                  <span className="deckyStoreCardInstallText">{t('PluginCard.plugin_install')}</span>
                </ButtonItem>
              </div>
              <div className="deckyStoreCardVersionContainer" style={{ minWidth: '130px' }}>
                <Dropdown
                  rgOptions={
                    plugin.versions.map((version: StorePluginVersion, index) => ({
                      data: index,
                      label: version.name,
                    })) as SingleDropdownOption[]
                  }
                  menuLabel={t('PluginCard.plugin_version_label') as string}
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
