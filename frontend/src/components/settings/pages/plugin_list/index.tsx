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

import { StorePluginVersion, getPluginList, requestPluginInstall } from '../../../../store';
import { useSetting } from '../../../../utils/hooks/useSetting';
import { useDeckyState } from '../../../DeckyState';

function labelToName(pluginLabel: string, pluginVersion?: string): string {
  return pluginVersion ? pluginLabel.substring(0, pluginLabel.indexOf(` - ${pluginVersion}`)) : pluginLabel;
}

async function reinstallPlugin(pluginName: string, currentVersion?: string) {
  const serverData = await getPluginList();
  const remotePlugin = serverData?.find((x) => x.name == pluginName);
  if (remotePlugin && remotePlugin.versions?.length > 0) {
    const currentVersionData = remotePlugin.versions.find((version) => version.name == currentVersion);
    if (currentVersionData) requestPluginInstall(pluginName, currentVersionData);
  }
}

function PluginInteractables(props: { entry: ReorderableEntry<PluginData> }) {
  const data = props.entry.data;
  const { t } = useTranslation();
  let pluginName = labelToName(props.entry.label, data?.version);

  const showCtxMenu = (e: MouseEvent | GamepadEvent) => {
    showContextMenu(
      <Menu label={t('PluginListIndex.list_plug_actions_label')}>
        <MenuItem onSelected={() => window.DeckyPluginLoader.importPlugin(pluginName, data?.version)}>
          {t('PluginListIndex.reload')}
        </MenuItem>
        <MenuItem
          onSelected={() =>
            window.DeckyPluginLoader.uninstallPlugin(
              pluginName,
              t('PluginLoader.plugin_uninstall.title', { name: props.entry.label }),
              t('PluginLoader.plugin_uninstall.button'),
              t('PluginLoader.plugin_uninstall.desc', { name: props.entry.label }),
            )
          }
        >
          {t('PluginListIndex.uninstall')}
        </MenuItem>
      </Menu>,
      e.currentTarget ?? window,
    );
  };

  return (
    <>
      {data?.update ? (
        <DialogButton
          style={{ height: '40px', minWidth: '60px', marginRight: '10px' }}
          onClick={() => requestPluginInstall(pluginName, data?.update as StorePluginVersion)}
          onOKButton={() => requestPluginInstall(pluginName, data?.update as StorePluginVersion)}
        >
          <div style={{ display: 'flex', flexDirection: 'row' }}>
            {t('PluginListIndex.list_update_to', { name: data?.update?.name })}
            <FaDownload style={{ paddingLeft: '2rem' }} />
          </div>
        </DialogButton>
      ) : (
        <DialogButton
          style={{ height: '40px', minWidth: '60px', marginRight: '10px' }}
          onClick={() => reinstallPlugin(pluginName, data?.version)}
          onOKButton={() => reinstallPlugin(pluginName, data?.version)}
        >
          <div style={{ display: 'flex', flexDirection: 'row' }}>
            {t('PluginListIndex.reinstall')}
            <FaRecycle style={{ paddingLeft: '5.3rem' }} />
          </div>
        </DialogButton>
      )}
      <DialogButton
        style={{ height: '40px', width: '40px', padding: '10px 12px', minWidth: '40px' }}
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
  const { plugins, updates, pluginOrder, setPluginOrder } = useDeckyState();
  const [_, setPluginOrderSetting] = useSetting<string[]>(
    'pluginOrder',
    plugins.map((plugin) => plugin.name),
  );
  const { t } = useTranslation();

  useEffect(() => {
    window.DeckyPluginLoader.checkPluginUpdates();
  }, []);

  const [pluginEntries, setPluginEntries] = useState<ReorderableEntry<PluginData>[]>([]);

  useEffect(() => {
    setPluginEntries(
      plugins.map((plugin) => {
        return {
          label: plugin.version ? `${plugin.name} - ${plugin.version}` : plugin.name,
          data: {
            update: updates?.get(plugin.name),
            version: plugin.version,
          },
          position: pluginOrder.indexOf(plugin.name),
        };
      }),
    );
  }, [plugins, updates]);

  if (plugins.length === 0) {
    return (
      <div>
        <p>{t('PluginListIndex.list_no_plugin')}</p>
      </div>
    );
  }

  function onSave(entries: ReorderableEntry<PluginData>[]) {
    const newOrder = entries.map((entry) => labelToName(entry.label, entry?.data?.version));
    console.log(newOrder);
    setPluginOrder(newOrder);
    setPluginOrderSetting(newOrder);
  }

  return (
    <DialogBody>
      <DialogControlsSection>
        <ReorderableList<PluginData> entries={pluginEntries} onSave={onSave} interactables={PluginInteractables} />
      </DialogControlsSection>
    </DialogBody>
  );
}
