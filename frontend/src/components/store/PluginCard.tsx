import { ButtonItem, Dropdown, Focusable, PanelSectionRow, SingleDropdownOption, SuspensefulImage } from '@decky/ui';
import { CSSProperties, FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowDown, FaArrowUp, FaCheck, FaDownload, FaRecycle } from 'react-icons/fa';

import { InstallType, Plugin } from '../../plugin';
import { StorePlugin, requestPluginInstall } from '../../store';
import ExternalLink from '../ExternalLink';

interface PluginCardProps {
  storePlugin: StorePlugin;
  installedPlugin: Plugin | undefined;
}

const PluginCard: FC<PluginCardProps> = ({ storePlugin, installedPlugin }) => {
  const [selectedOption, setSelectedOption] = useState<number>(0);
  const installedVersionIndex = storePlugin.versions.findIndex((version) => version.name === installedPlugin?.version);
  const installType = // This assumes index in options is inverse to update order (i.e. newer updates are first)
    installedPlugin && selectedOption < installedVersionIndex
      ? InstallType.UPDATE
      : installedPlugin && selectedOption === installedVersionIndex
        ? InstallType.REINSTALL
        : installedPlugin && selectedOption > installedVersionIndex
          ? InstallType.DOWNGRADE
          : installedPlugin // can happen if installed version is not in store
            ? InstallType.OVERWRITE
            : InstallType.INSTALL;

  const root = storePlugin.tags.some((tag) => tag === 'root');

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
          src={storePlugin.image_url}
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
            {storePlugin.name}
          </span>
          <span
            className="deckyStoreCardAuthor"
            style={{
              marginRight: 'auto',
              fontSize: '1em',
            }}
          >
            {storePlugin.author}
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
            {storePlugin.description ? (
              storePlugin.description
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
              <ExternalLink
                className="deckyStoreCardDescriptionRootLink"
                href="https://deckbrew.xyz/root"
                target="_blank"
                style={{
                  color: '#fee75c',
                  textDecoration: 'none',
                }}
              >
                deckbrew.xyz/root
              </ExternalLink>
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
                    requestPluginInstall(storePlugin.name, storePlugin.versions[selectedOption], installType)
                  }
                >
                  <span
                    className="deckyStoreCardInstallText"
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}
                  >
                    {installType === InstallType.UPDATE ? (
                      <>
                        <FaArrowUp /> {t('PluginCard.plugin_update')}
                      </>
                    ) : installType === InstallType.REINSTALL ? (
                      <>
                        <FaRecycle /> {t('PluginCard.plugin_reinstall')}
                      </>
                    ) : installType === InstallType.DOWNGRADE ? (
                      <>
                        <FaArrowDown /> {t('PluginCard.plugin_downgrade')}
                      </>
                    ) : installType === InstallType.OVERWRITE ? (
                      <>
                        <FaDownload /> {t('PluginCard.plugin_overwrite')}
                      </>
                    ) : (
                      // installType === InstallType.INSTALL (also fallback)
                      <>
                        <FaDownload /> {t('PluginCard.plugin_install')}
                      </>
                    )}
                  </span>
                </ButtonItem>
              </div>
              <div className="deckyStoreCardVersionContainer" style={{ minWidth: '130px' }}>
                <Dropdown
                  rgOptions={
                    storePlugin.versions.map((version, index) => ({
                      data: index,
                      label: (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {version.name}
                          {installedPlugin && installedVersionIndex === index ? <FaCheck /> : null}
                        </div>
                      ),
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
