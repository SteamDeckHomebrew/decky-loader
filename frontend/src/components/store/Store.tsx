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
import { Dispatch, FC, SetStateAction, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import logo from '../../../assets/plugin_store.png';
import Logger from '../../logger';
import { SortDirections, SortOptions, Store, StorePlugin, getPluginList, getStore } from '../../store';
import PluginCard from './PluginCard';

const logger = new Logger('Store');

const StorePage: FC<{}> = () => {
  const [currentTabRoute, setCurrentTabRoute] = useState<string>('browse');
  const [pluginCount, setPluginCount] = useState<number | null>(null);
  const { TabCount } = findModule((m) => {
    if (m?.TabCount && m?.TabTitle) return true;
    return false;
  });

  const { t } = useTranslation();

  return (
    <>
      <div
        style={{
          marginTop: '40px',
          height: 'calc( 100% - 40px )',
          background: '#0005',
        }}
      >
        <Tabs
          activeTab={currentTabRoute}
          onShowTab={(tabId: string) => {
            setCurrentTabRoute(tabId);
          }}
          tabs={[
            {
              title: t('Store.store_tabs.title'),
              content: <BrowseTab children={{ setPluginCount: setPluginCount }} />,
              id: 'browse',
              renderTabAddon: () => <span className={TabCount}>{pluginCount}</span>,
            },
            {
              title: t('Store.store_tabs.about'),
              content: <AboutTab />,
              id: 'about',
            },
          ]}
        />
      </div>
    </>
  );
};

const BrowseTab: FC<{ children: { setPluginCount: Dispatch<SetStateAction<number | null>> } }> = (data) => {
  const { t } = useTranslation();

  const dropdownSortOptions = useMemo(
    (): DropdownOption[] => [
      // ascending and descending order are the wrong way around for the alphabetical sort
      // this is because it was initially done incorrectly for i18n and 'fixing' it would
      // make all the translations incorrect
      { data: [SortOptions.name, SortDirections.ascending], label: t('Store.store_tabs.alph_desc') },
      { data: [SortOptions.name, SortDirections.descending], label: t('Store.store_tabs.alph_asce') },
      { data: [SortOptions.date, SortDirections.ascending], label: t('Store.store_tabs.date_asce') },
      { data: [SortOptions.date, SortDirections.descending], label: t('Store.store_tabs.date_desc') },
      { data: [SortOptions.downloads, SortDirections.ascending], label: t('Store.store_tabs.downloads_asce') },
      { data: [SortOptions.downloads, SortDirections.descending], label: t('Store.store_tabs.downloads_desc') },
    ],
    [],
  );

  // const filterOptions = useMemo((): DropdownOption[] => [{ data: 1, label: 'All' }], []);
  const [selectedSort, setSort] = useState<[SortOptions, SortDirections]>(dropdownSortOptions[0].data);
  // const [selectedFilter, setFilter] = useState<number>(filterOptions[0].data);
  const [searchFieldValue, setSearchValue] = useState<string>('');
  const [pluginList, setPluginList] = useState<StorePlugin[] | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const res = await getPluginList(selectedSort[0], selectedSort[1]);
      logger.log('got data!', res);
      setPluginList(res);
      data.children.setPluginCount(res.length);
    })();
  }, [selectedSort]);

  useEffect(() => {
    (async () => {
      const storeRes = await getStore();
      logger.log(`store is ${storeRes}, isTesting is ${storeRes === Store.Testing}`);
      setIsTesting(storeRes === Store.Testing);
    })();
  }, []);

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
            <span className="DialogLabel">{t("Store.store_sort.label")}</span>
            <Dropdown
              menuLabel={t("Store.store_sort.label") as string}
              rgOptions={dropdownSortOptions}
              strDefaultLabel={t("Store.store_sort.label_def") as string}
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
            <span className="DialogLabel">{t("Store.store_filter.label")}</span>
            <Dropdown
              menuLabel={t("Store.store_filter.label")}
              rgOptions={filterOptions}
              strDefaultLabel={t("Store.store_filter.label_def")}
              selectedOption={selectedFilter}
              onChange={(e) => setFilter(e.data)}
            />
          </div>
        </Focusable>
      </PanelSectionRow>
      <div style={{ justifyContent: 'center', display: 'flex' }}>
        <Focusable style={{ display: 'flex', alignItems: 'center', width: '96%' }}>
          <div style={{ width: '100%' }}>
            <TextField label={t("Store.store_search.label")} value={searchFieldValue} onChange={(e) => setSearchValue(e.target.value)} />
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
            <span className="DialogLabel">{t('Store.store_sort.label')}</span>
            <Dropdown
              menuLabel={t('Store.store_sort.label') as string}
              rgOptions={dropdownSortOptions}
              strDefaultLabel={t('Store.store_sort.label_def') as string}
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
              label={t('Store.store_search.label')}
              value={searchFieldValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
        </Focusable>
      </div>
      {isTesting && (
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            marginLeft: '20px',
            marginRight: '20px',
            marginBottom: '20px',
            padding: '8px 36px',
            background: 'rgba(255, 255, 0, 0.067)',
            textAlign: 'center',
            border: '2px solid rgba(255, 255, 0, 0.467)',
          }}
        >
          <h2 style={{ margin: 0 }}>{t('Store.store_testing_warning.label')}</h2>
          <span>
            {`${t('Store.store_testing_warning.desc')} `}
            <a
              href="https://decky.xyz/testing"
              target="_blank"
              style={{
                textDecoration: 'none',
              }}
            >
              decky.xyz/testing
            </a>
          </span>
        </div>
      )}
      <div>
        {!pluginList ? (
          <div style={{ height: '100%' }}>
            <SteamSpinner />
          </div>
        ) : (
          pluginList
            .filter((plugin: StorePlugin) => {
              return (
                plugin.name.toLowerCase().includes(searchFieldValue.toLowerCase()) ||
                plugin.description.toLowerCase().includes(searchFieldValue.toLowerCase()) ||
                plugin.author.toLowerCase().includes(searchFieldValue.toLowerCase()) ||
                plugin.tags.some((tag: string) => tag.toLowerCase().includes(searchFieldValue.toLowerCase()))
              );
            })
            .map((plugin: StorePlugin) => <PluginCard plugin={plugin} />)
        )}
      </div>
    </>
  );
};

const AboutTab: FC<{}> = () => {
  const { t } = useTranslation();

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
        {t('Store.store_testing_cta')}{' '}
        <a
          href="https://decky.xyz/testing"
          target="_blank"
          style={{
            textDecoration: 'none',
          }}
        >
          decky.xyz/testing
        </a>
      </span>
      <span className="deckyStoreAboutHeader">{t('Store.store_contrib.label')}</span>
      <span>{t('Store.store_contrib.desc')}</span>
      <span className="deckyStoreAboutHeader">{t('Store.store_source.label')}</span>
      <span>{t('Store.store_source.desc')}</span>
    </div>
  );
};

export default StorePage;
