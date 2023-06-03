import {
  DialogBody,
  DialogButton,
  DialogControlsSection,
  GamepadEvent,
  Menu,
  MenuItem,
  ReorderableEntry,
  ReorderableList,
  showContextMenu,
} from 'decky-frontend-lib';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaEllipsisH, FaRecycle } from 'react-icons/fa';

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

type PluginTableData = PluginData & { name: string; hidden: boolean; onHide(): void; onShow(): void };

function PluginInteractables(props: { entry: ReorderableEntry<PluginTableData> }) {
  const { t } = useTranslation();

  // nothing to display without this data...
  if (!props.entry.data) {
    return null;
  }

  const { name, update, version, onHide, onShow, hidden } = props.entry.data;

  const showCtxMenu = (e: MouseEvent | GamepadEvent) => {
    showContextMenu(
      <Menu label={t('PluginListIndex.plugin_actions')}>
        <MenuItem
          onSelected={() => {
            try {
              fetch(`http://127.0.0.1:1337/plugins/${name}/reload`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                  Authentication: window.deckyAuthToken,
                },
              });
            } catch (err) {
              console.error('Error Reloading Plugin Backend', err);
            }

            window.DeckyPluginLoader.importPlugin(name, version);
          }}
        >
          {t('PluginListIndex.reload')}
        </MenuItem>
        <MenuItem
          onSelected={() =>
            window.DeckyPluginLoader.uninstallPlugin(
              name,
              t('PluginLoader.plugin_uninstall.title', { name }),
              t('PluginLoader.plugin_uninstall.button'),
              t('PluginLoader.plugin_uninstall.desc', { name }),
            )
          }
        >
          {t('PluginListIndex.uninstall')}
        </MenuItem>
        {hidden ? (
          <MenuItem onSelected={onShow}>{t('PluginListIndex.show')}</MenuItem>
        ) : (
          <MenuItem onSelected={onHide}>{t('PluginListIndex.hide')}</MenuItem>
        )}
      </Menu>,
      e.currentTarget ?? window,
    );
  };

  return (
    <>
      {update ? (
        <DialogButton
          style={{ height: '40px', minWidth: '60px', marginRight: '10px' }}
          onClick={() => requestPluginInstall(name, update, InstallType.UPDATE)}
          onOKButton={() => requestPluginInstall(name, update, InstallType.UPDATE)}
        >
          <div style={{ display: 'flex', minWidth: '180px', justifyContent: 'space-between', alignItems: 'center' }}>
            {t('PluginListIndex.update_to', { name: update.name })}
            <FaDownload style={{ paddingLeft: '1rem' }} />
          </div>
        </DialogButton>
      ) : (
        <DialogButton
          style={{ height: '40px', minWidth: '60px', marginRight: '10px' }}
          onClick={() => reinstallPlugin(name, version)}
          onOKButton={() => reinstallPlugin(name, version)}
        >
          <div style={{ display: 'flex', minWidth: '180px', justifyContent: 'space-between', alignItems: 'center' }}>
            {t('PluginListIndex.reinstall')}
            <FaRecycle style={{ paddingLeft: '1rem' }} />
          </div>
        </DialogButton>
      )}
      <DialogButton
        style={{
          height: '40px',
          width: '40px',
          padding: '10px 12px',
          minWidth: '40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
        onClick={showCtxMenu}
        onOKButton={showCtxMenu}
      >
        <FaEllipsisH />
      </DialogButton>
    </>
  );
}

type PluginData = {
  update?: StorePluginVersion;
  version?: string;
};

export default function PluginList() {
  const { plugins, updates, pluginOrder, setPluginOrder, hiddenPlugins } = useDeckyState();
  const [_, setPluginOrderSetting] = useSetting<string[]>(
    'pluginOrder',
    plugins.map((plugin) => plugin.name),
  );
  const { t } = useTranslation();

  useEffect(() => {
    window.DeckyPluginLoader.checkPluginUpdates();
  }, []);

  const [pluginEntries, setPluginEntries] = useState<ReorderableEntry<PluginTableData>[]>([]);
  const hiddenPluginsService = window.DeckyPluginLoader.hiddenPluginsService;

  useEffect(() => {
    setPluginEntries(
      plugins.map(({ name, version }) => {
        const hidden = hiddenPlugins.includes(name);

        return {
          label: <PluginListLabel name={name} hidden={hidden} version={version} />,
          position: pluginOrder.indexOf(name),
          data: {
            name,
            hidden,
            version,
            update: updates?.get(name),
            onHide: () => hiddenPluginsService.update([...hiddenPlugins, name]),
            onShow: () => hiddenPluginsService.update(hiddenPlugins.filter((pluginName) => name !== pluginName)),
          },
        };
      }),
    );
  }, [plugins, updates, hiddenPlugins]);

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
          }}
        >
          {t('PluginListIndex.update_all', { count: updates.size })}
          <FaDownload style={{ paddingLeft: '1rem' }} />
        </DialogButton>
      )}
      <DialogControlsSection style={{ marginTop: 0 }}>
        <ReorderableList<PluginTableData> entries={pluginEntries} onSave={onSave} interactables={PluginInteractables} />
      </DialogControlsSection>
    </DialogBody>
  );
}
