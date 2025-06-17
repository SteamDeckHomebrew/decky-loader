import {
  Dropdown,
  Focusable,
  PanelSectionRow,
  SingleDropdownOption,
  SteamSpinner,
  Tabs,
  TextField,
  findModule,
} from '@decky/ui';
import { Dispatch, FC, SetStateAction, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import logo from '../../../assets/plugin_store.png';
import Logger from '../../logger';
import { SortKeys, Store, StoreFilter, StorePlugin, getPluginList, getStore } from '../../store';
import { useDeckyState } from '../DeckyState';
import ExternalLink from '../ExternalLink';
import PluginCard from './PluginCard';

interface DropdownOptions<TData = unknown> extends SingleDropdownOption {
    data: TData;
}

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
              content: <BrowseTab setPluginCount={setPluginCount} />,
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

// Functions for each of the store sort options
const storeSortFunctions: Record<SortKeys, Parameters<Array<StorePlugin>['sort']>[0]> = {
  'name-ascending': (a, b) => a.name.localeCompare(b.name),
  'name-descending': (a, b) => b.name.localeCompare(a.name),
  'date-ascending': (a, b) => new Date(a.updated).valueOf() - new Date(b.updated).valueOf(),
  'date-descending': (a, b) => new Date(b.updated).valueOf() - new Date(a.updated).valueOf(),
  'downloads-ascending': (a, b) => b.downloads - a.downloads,
  'downloads-descending': (a, b) => a.downloads - b.downloads,
};

const BrowseTab: FC<{ setPluginCount: Dispatch<SetStateAction<number | null>> }> = ({ setPluginCount }) => {
  const { t } = useTranslation();

  const dropdownSortOptions = useMemo(
    (): DropdownOptions<SortKeys>[] => [
      // ascending and descending order are the wrong way around for the alphabetical sort
      // this is because it was initially done incorrectly for i18n and 'fixing' it would
      // make all the translations incorrect
      { data: 'name-ascending', label: t('Store.store_tabs.alph_desc') },
      { data: 'name-descending', label: t('Store.store_tabs.alph_asce') },
      { data: 'date-ascending', label: t('Store.store_tabs.date_asce') },
      { data: 'date-descending', label: t('Store.store_tabs.date_desc') },
      { data: 'downloads-ascending', label: t('Store.store_tabs.downloads_desc') },
      { data: 'downloads-descending', label: t('Store.store_tabs.downloads_asce') },
    ],
    [],
  );

  // Our list of filters populates automatically based on the enum and matches directly to locale strings
  const filterOptions = useMemo(
    () =>
      Object.keys(StoreFilter).map<DropdownOptions<StoreFilter>>(
        (key) => ({
          data: StoreFilter[key as keyof typeof StoreFilter],
          label: t(`Store.store_filter.options.${StoreFilter[key as keyof typeof StoreFilter]}`),
        }),
        {},
      ),
    [],
  );

  const [selectedSort, setSort] = useState<DropdownOptions<SortKeys>['data']>(dropdownSortOptions[0].data);
  const [filter, setFilter] = useState<StoreFilter>(filterOptions[0].data);
  const [searchFieldValue, setSearchValue] = useState<string>('');
  const [pluginList, setPluginList] = useState<StorePlugin[] | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  const { plugins: installedPlugins } = useDeckyState();

  const hasInstalledPlugin = (plugin: StorePlugin) =>
    installedPlugins?.find((installedPlugin) => installedPlugin.name === plugin.name);

  const filterPlugin = (plugin: StorePlugin): boolean => {
    switch (filter) {
      case StoreFilter.Installed:
        return !!hasInstalledPlugin(plugin);
      case StoreFilter.NotInstalled:
        return !hasInstalledPlugin(plugin);
      default:
        return true;
    }
  };

  const renderedList = useMemo(() => {
    // Use an empty array in case it's null
    const plugins = pluginList || [];
    return (
      <>
        {plugins
          .filter(filterPlugin)
          .filter(
            (plugin) =>
              plugin.name.toLowerCase().includes(searchFieldValue.toLowerCase()) ||
              plugin.description.toLowerCase().includes(searchFieldValue.toLowerCase()) ||
              plugin.author.toLowerCase().includes(searchFieldValue.toLowerCase()) ||
              plugin.tags.some((tag) => tag.toLowerCase().includes(searchFieldValue.toLowerCase())),
          )
          .sort(storeSortFunctions[selectedSort])
          .map((plugin) => (
            <PluginCard storePlugin={plugin} installedPlugin={hasInstalledPlugin(plugin)} />
          ))}
      </>
    );
  }, [pluginList, filter, searchFieldValue, selectedSort, installedPlugins, storeSortFunctions]);

  useEffect(() => {
    (async () => {
      const res = await getPluginList();
      logger.debug('got data!', res);
      setPluginList(res);
      setPluginCount(res.length);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const storeRes = await getStore();
      logger.debug(`store is ${storeRes}, isTesting is ${storeRes === Store.Testing}`);
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
      <PanelSectionRow>
        <Focusable style={{ display: 'flex', maxWidth: '100%', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
            }}
          >
            <span className="DialogLabel">{t('Store.store_filter.label')}</span>
            <Dropdown
              menuLabel={t('Store.store_filter.label')}
              rgOptions={filterOptions}
              strDefaultLabel={t('Store.store_filter.label_def')}
              selectedOption={filter}
              onChange={(e) => setFilter(e.data)}
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
            <ExternalLink
              href="https://decky.xyz/testing"
              target="_blank"
              style={{
                textDecoration: 'none',
              }}
            >
              decky.xyz/testing
            </ExternalLink>
          </span>
        </div>
      )}
      <div>
        {!pluginList ? (
          <div style={{ height: '100%' }}>
            <SteamSpinner background="transparent" />
          </div>
        ) : (
          renderedList
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
        <ExternalLink
          href="https://decky.xyz/testing"
          target="_blank"
          style={{
            textDecoration: 'none',
          }}
        >
          decky.xyz/testing
        </ExternalLink>
      </span>
      <span className="deckyStoreAboutHeader">{t('Store.store_contrib.label')}</span>
      <span>{t('Store.store_contrib.desc')}</span>
      <span className="deckyStoreAboutHeader">{t('Store.store_source.label')}</span>
      <span>{t('Store.store_source.desc')}</span>
    </div>
  );
};

export default StorePage;
