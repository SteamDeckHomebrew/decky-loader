import {
  Dropdown,
  DropdownOption,
  Focusable,
  PanelSectionRow,
  SteamSpinner,
  Tabs,
  TextField,
  findModule,
} from 'decky-frontend-lib';
import { FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import logo from '../../../assets/plugin_store.png';
import Logger from '../../logger';
import { StorePlugin, getPluginList } from '../../store';
import PluginCard from './PluginCard';

const { t } = useTranslation('Store');

const logger = new Logger('FilePicker');

const StorePage: FC<{}> = () => {
  const [currentTabRoute, setCurrentTabRoute] = useState<string>('browse');
  const [data, setData] = useState<StorePlugin[] | null>(null);
  const { TabCount } = findModule((m) => {
    if (m?.TabCount && m?.TabTitle) return true;
    return false;
  });

  useEffect(() => {
    (async () => {
      const res = await getPluginList();
      logger.log('got data!', res);
      setData(res);
    })();
  }, []);

  return (
    <>
      <div
        style={{
          marginTop: '40px',
          height: 'calc( 100% - 40px )',
          background: '#0005',
        }}
      >
        {!data ? (
          <div style={{ height: '100%' }}>
            <SteamSpinner />
          </div>
        ) : (
          <Tabs
            activeTab={currentTabRoute}
            onShowTab={(tabId: string) => {
              setCurrentTabRoute(tabId);
            }}
            tabs={[
              {
                title: t('store_tabs_title'),
                content: <BrowseTab children={{ data: data }} />,
                id: 'browse',
                renderTabAddon: () => <span className={TabCount}>{data.length}</span>,
              },
              {
                title: t('store_tabs_about'),
                content: <AboutTab />,
                id: 'about',
              },
            ]}
          />
        )}
      </div>
    </>
  );
};

const BrowseTab: FC<{ children: { data: StorePlugin[] } }> = (data) => {
  const sortOptions = useMemo(
    (): DropdownOption[] => [
      { data: 1, label: t('store_tabs_alph_desc') },
      { data: 2, label: t('store_tabs_alph_asce') },
    ],
    [],
  );

  // const filterOptions = useMemo((): DropdownOption[] => [{ data: 1, label: 'All' }], []);

  const [selectedSort, setSort] = useState<number>(sortOptions[0].data);
  // const [selectedFilter, setFilter] = useState<number>(filterOptions[0].data);
  const [searchFieldValue, setSearchValue] = useState<string>('');

  return (
    <>
      <style>{`
              .deckyStoreCardInstallContainer > .Panel {
                padding: 0;
              }
            `}</style>
      {/* This should be used once filtering is added

      <PanelSectionRow>
        <Focusable style={{ display: 'flex', maxWidth: '100%' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '47.5%',
            }}
          >
            <span className="DialogLabel">{t("store_sort_label")}</span>
            <Dropdown
              menuLabel={t("store_sort_label") as string}
              rgOptions={sortOptions}
              strDefaultLabel={t("store_sort_label_def") as string}
              selectedOption={selectedSort}
              onChange={(e) => setSort(e.data)}
            />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '47.5%',
              marginLeft: 'auto',
            }}
          >
            <span className="DialogLabel">{t("store_filter_label")}</span>
            <Dropdown
              menuLabel={t("store_filter_label")}
              rgOptions={filterOptions}
              strDefaultLabel={t("store_fiter_label_def")}
              selectedOption={selectedFilter}
              onChange={(e) => setFilter(e.data)}
            />
          </div>
        </Focusable>
      </PanelSectionRow>
      <div style={{ justifyContent: 'center', display: 'flex' }}>
        <Focusable style={{ display: 'flex', alignItems: 'center', width: '96%' }}>
          <div style={{ width: '100%' }}>
            <TextField label={t("store_search_label")} value={searchFieldValue} onChange={(e) => setSearchValue(e.target.value)} />
          </div>
        </Focusable>
      </div>
      */}
      <PanelSectionRow>
        <Focusable style={{ display: 'flex', maxWidth: '100%' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: '100%',
              maxWidth: '100%',
            }}
          >
            <span className="DialogLabel">{t('store_sort_label')}</span>
            <Dropdown
              menuLabel={t('store_sort_label') as string}
              rgOptions={sortOptions}
              strDefaultLabel={t('store_sort_label_def') as string}
              selectedOption={selectedSort}
              onChange={(e) => setSort(e.data)}
            />
          </div>
        </Focusable>
      </PanelSectionRow>
      <div style={{ justifyContent: 'center', display: 'flex' }}>
        <Focusable style={{ display: 'flex', alignItems: 'center', width: '96%' }}>
          <div style={{ width: '100%' }}>
            <TextField
              label={t('store_search_label')}
              value={searchFieldValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
        </Focusable>
      </div>
      <div>
        {data.children.data
          .filter((plugin: StorePlugin) => {
            return (
              plugin.name.toLowerCase().includes(searchFieldValue.toLowerCase()) ||
              plugin.description.toLowerCase().includes(searchFieldValue.toLowerCase()) ||
              plugin.author.toLowerCase().includes(searchFieldValue.toLowerCase()) ||
              plugin.tags.some((tag: string) => tag.toLowerCase().includes(searchFieldValue.toLowerCase()))
            );
          })
          .sort((a, b) => {
            if (selectedSort % 2 === 1) return a.name.localeCompare(b.name);
            else return b.name.localeCompare(a.name);
          })
          .map((plugin: StorePlugin) => (
            <PluginCard plugin={plugin} />
          ))}
      </div>
    </>
  );
};

const AboutTab: FC<{}> = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
              .deckyStoreAboutHeader {
                font-size: 24px;
                font-weight: 600;
                margin-top: 20px;
              }
            `}</style>
      <img
        src={logo}
        style={{
          width: '256px',
          height: 'auto',
          alignSelf: 'center',
        }}
      />
      <span className="deckyStoreAboutHeader">Testing</span>
      <span>
        {t('store_testing_cta')}{' '}
        <a
          href="https://deckbrew.xyz/testing"
          target="_blank"
          style={{
            textDecoration: 'none',
          }}
        >
          deckbrew.xyz/testing
        </a>
      </span>
      <span className="deckyStoreAboutHeader">{t('store_contrib_label')}</span>
      <span>{t('store_contrib_desc')}</span>
      <span className="deckyStoreAboutHeader">{t('store_source_label')}</span>
      <span>{t('store_source_desc')}</span>
    </div>
  );
};

export default StorePage;
