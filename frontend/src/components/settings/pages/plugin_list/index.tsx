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
import { FaDownload, FaEllipsisH } from 'react-icons/fa';

import { StorePluginVersion, requestPluginInstall } from '../../../../store';
import { useSetting } from '../../../../utils/hooks/useSetting';
import { useDeckyState } from '../../../DeckyState';

function PluginInteractables(props: { entry: ReorderableEntry<PluginData> }) {
  const data = props.entry.data;

  const showCtxMenu = (e: MouseEvent | GamepadEvent) => {
    showContextMenu(
      <Menu label="Plugin Actions">
        <MenuItem onSelected={() => window.DeckyPluginLoader.importPlugin(props.entry.label, data?.version)}>
          Reload
        </MenuItem>
        <MenuItem onSelected={() => window.DeckyPluginLoader.uninstallPlugin(props.entry.label)}>Uninstall</MenuItem>
      </Menu>,
      e.currentTarget ?? window,
    );
  };

  return (
    <>
      {data?.update && (
        <DialogButton
          style={{ height: '40px', minWidth: '60px', marginRight: '10px' }}
          onClick={() => requestPluginInstall(props.entry.label, data?.update as StorePluginVersion)}
          onOKButton={() => requestPluginInstall(props.entry.label, data?.update as StorePluginVersion)}
        >
          <div style={{ display: 'flex', flexDirection: 'row' }}>
            Update to {data?.update?.name}
            <FaDownload style={{ paddingLeft: '2rem' }} />
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

  useEffect(() => {
    window.DeckyPluginLoader.checkPluginUpdates();
  }, []);

  const [pluginEntries, setPluginEntries] = useState<ReorderableEntry<PluginData>[]>([]);

  useEffect(() => {
    setPluginEntries(
      plugins.map((plugin) => {
        return {
          label: `${plugin.name} - ${plugin.version}`,
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
        <p>No plugins installed</p>
      </div>
    );
  }

  function onSave(entries: ReorderableEntry<PluginData>[]) {
    const newOrder = entries.map((entry) => entry.label);
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
