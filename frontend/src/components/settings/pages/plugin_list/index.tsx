import {
  DialogBody,
  DialogButton,
  DialogControlsSection,
  GamepadEvent,
  Menu,
  MenuItem,
  MenuSeparator,
  Navigation,
  QuickAccessTab,
  ReorderableEntry,
  ReorderableList,
  showContextMenu,
} from '@decky/ui';
import { CSSProperties, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaEllipsisH } from 'react-icons/fa';
import { TbLayoutSidebarRightExpandFilled } from 'react-icons/tb';

import { InstallType } from '../../../../plugin';
import {
  StorePluginVersion,
  getPluginList,
  requestMultiplePluginInstalls,
  requestPluginInstall,
} from '../../../../store';
import { useSetting } from '../../../../utils/hooks/useSetting';
import { useDeckyState } from '../../../DeckyState';
import PluginListLabel from './PluginListLabel';

async function reinstallPlugin(pluginName: string, currentVersion?: string) {
  const serverData = await getPluginList();
  const remotePlugin = serverData?.find((x) => x.name == pluginName);
  if (remotePlugin && remotePlugin.versions?.length > 0) {
    const currentVersionData = remotePlugin.versions.find((version) => version.name == currentVersion);
    if (currentVersionData) requestPluginInstall(pluginName, currentVersionData, InstallType.REINSTALL);
  }
}

type PluginTableData = PluginData & {
  name: string;
  frozen: boolean;
  onFreeze(): void;
  onUnfreeze(): void;
  hidden: boolean;
  onHide(): void;
  onShow(): void;
  onOpen(): void;
  isDeveloper: boolean;
};

const reloadPluginBackend = DeckyBackend.callable<[pluginName: string], void>('loader/reload_plugin');

const squareButtonStyle: CSSProperties = {
  height: '40px',
  width: '40px',
  minWidth: '40px',
  padding: '0',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
};

function PluginInteractables(props: { entry: ReorderableEntry<PluginTableData> }) {
  const { t } = useTranslation();

  // nothing to display without this data...
  if (!props.entry.data) {
    return null;
  }

  const { name, update, version, onHide, onShow, hidden, onFreeze, onUnfreeze, frozen, isDeveloper, onOpen } =
    props.entry.data;

  const showCtxMenu = (e: MouseEvent | GamepadEvent) => {
    showContextMenu(
      <Menu label={t('PluginListIndex.plugin_actions')}>
        <MenuItem
          onSelected={async () => {
            try {
              await reloadPluginBackend(name);
            } catch (err) {
              console.error('Error Reloading Plugin Backend', err);
            }
          }}
        >
          {t('PluginListIndex.reload')}
        </MenuItem>
        <MenuItem onSelected={() => reinstallPlugin(name, version)}>{t('PluginListIndex.reinstall')}</MenuItem>
        <MenuItem
          onSelected={() =>
            DeckyPluginLoader.uninstallPlugin(
              name,
              t('PluginLoader.plugin_uninstall.title', { name }),
              t('PluginLoader.plugin_uninstall.button'),
              t('PluginLoader.plugin_uninstall.desc', { name }),
            )
          }
        >
          {t('PluginListIndex.uninstall')}
        </MenuItem>

        <MenuSeparator />

        {hidden ? (
          <MenuItem onSelected={onShow}>{t('PluginListIndex.show')}</MenuItem>
        ) : (
          <MenuItem onSelected={onHide}>{t('PluginListIndex.hide')}</MenuItem>
        )}
        {frozen ? (
          <MenuItem onSelected={onUnfreeze}>{t('PluginListIndex.unfreeze')}</MenuItem>
        ) : (
          isDeveloper && <MenuItem onSelected={onFreeze}>{t('PluginListIndex.freeze')}</MenuItem>
        )}
      </Menu>,
      e.currentTarget ?? window,
    );
  };

  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      {update ? (
        <DialogButton
          style={{
            flex: '1 1',
            minWidth: 'unset',
            height: '40px',
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onClick={() => requestPluginInstall(name, update, InstallType.UPDATE)}
          onOKButton={() => requestPluginInstall(name, update, InstallType.UPDATE)}
        >
          {t('PluginListIndex.update_to', { name: update.name })} <FaDownload />
        </DialogButton>
      ) : null}
      <DialogButton style={squareButtonStyle} onClick={onOpen} onOKButton={onOpen}>
        <TbLayoutSidebarRightExpandFilled
          // make size more consistent with the rest of icons in app
          size={'1.5rem'}
        />
      </DialogButton>
      <DialogButton style={squareButtonStyle} onClick={showCtxMenu} onOKButton={showCtxMenu}>
        <FaEllipsisH />
      </DialogButton>
    </div>
  );
}

type PluginData = {
  update?: StorePluginVersion;
  version?: string;
};

export default function PluginList({ isDeveloper }: { isDeveloper: boolean }) {
  const { plugins, updates, pluginOrder, setPluginOrder, frozenPlugins, hiddenPlugins, setActivePlugin } =
    useDeckyState();
  const [_, setPluginOrderSetting] = useSetting<string[]>(
    'pluginOrder',
    plugins.map((plugin) => plugin.name),
  );
  const { t } = useTranslation();

  useEffect(() => {
    DeckyPluginLoader.checkPluginUpdates();
  }, []);

  const pluginEntries = useMemo(
    () =>
      plugins.map(({ name, version }) => {
        const hiddenPluginsService = DeckyPluginLoader.hiddenPluginsService;
        const frozenPluginsService = DeckyPluginLoader.frozenPluginsService;

        const frozen = frozenPlugins.includes(name);
        const hidden = hiddenPlugins.includes(name);

        const update = updates?.get(name);

        return {
          label: <PluginListLabel name={name} frozen={frozen} hidden={hidden} version={version} update={update} />,
          position: pluginOrder.indexOf(name),
          data: {
            name,
            frozen,
            hidden,
            isDeveloper,
            version,
            update,
            onFreeze: () => frozenPluginsService.update([...frozenPlugins, name]),
            onUnfreeze: () => frozenPluginsService.update(frozenPlugins.filter((pluginName) => name !== pluginName)),
            onHide: () => hiddenPluginsService.update([...hiddenPlugins, name]),
            onShow: () => hiddenPluginsService.update(hiddenPlugins.filter((pluginName) => name !== pluginName)),
            onOpen: () => {
              setActivePlugin(name);
              Navigation.OpenQuickAccessMenu(QuickAccessTab.Decky);
            },
          },
        };
      }),
    [plugins, updates, frozenPlugins, hiddenPlugins, setActivePlugin],
  );

  if (plugins.length === 0) {
    return (
      <div>
        <p>{t('PluginListIndex.no_plugin')}</p>
      </div>
    );
  }

  function onSave(entries: ReorderableEntry<PluginTableData>[]) {
    const newOrder = entries.map((entry) => entry.data!.name);
    console.log(newOrder);
    setPluginOrder(newOrder);
    setPluginOrderSetting(newOrder);
  }

  return (
    <DialogBody>
      {updates && updates.size > 0 && (
        <DialogButton
          onClick={() =>
            requestMultiplePluginInstalls(
              [...updates.entries()].map(([plugin, selectedVer]) => ({
                installType: InstallType.UPDATE,
                plugin,
                selectedVer,
              })),
            )
          }
          style={{
            position: 'absolute',
            top: '57px',
            right: '2.8vw',
            width: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          {t('PluginListIndex.update_all', { count: updates.size })}
          <FaDownload />
        </DialogButton>
      )}
      <DialogControlsSection style={{ marginTop: 0 }}>
        <ReorderableList<PluginTableData> entries={pluginEntries} onSave={onSave} interactables={PluginInteractables} />
      </DialogControlsSection>
    </DialogBody>
  );
}
