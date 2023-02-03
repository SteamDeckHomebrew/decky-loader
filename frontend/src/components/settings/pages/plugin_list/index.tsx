import { DialogBody, DialogButton, DialogControlsSection, Menu, MenuItem, showContextMenu } from 'decky-frontend-lib';
import { Fragment, useEffect } from 'react';
import { FaDownload, FaEllipsisH } from 'react-icons/fa';

import { StorePluginVersion, requestPluginInstall } from '../../../../store';
import { useSetting } from '../../../../utils/hooks/useSetting';
import { useDeckyState } from '../../../DeckyState';
import { ReorderableEntry, ReorderableList } from './ReorderableList';

function PluginInteractables(props: { entry: ReorderableEntry<PluginData> }) {
  const data = props.entry.data;

  return (
    <Fragment>
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
        onClick={(e: MouseEvent) =>
          showContextMenu(
            <Menu label="Plugin Actions">
              <MenuItem onSelected={() => window.DeckyPluginLoader.importPlugin(props.entry.label, data?.version)}>
                Reload
              </MenuItem>
              <MenuItem onSelected={() => window.DeckyPluginLoader.uninstallPlugin(props.entry.label)}>
                Uninstall
              </MenuItem>
            </Menu>,
            e.currentTarget ?? window,
          )
        }
      >
        <FaEllipsisH />
      </DialogButton>
    </Fragment>
  );
}

type PluginData = {
  update?: StorePluginVersion;
  version?: string;
};

export default function PluginList() {
  const { plugins, updates } = useDeckyState();
  const [pluginOrder, setPluginOrder] = useSetting(
    'pluginOrder',
    plugins.map((plugin) => plugin.name),
  );

  useEffect(() => {
    window.DeckyPluginLoader.checkPluginUpdates();
  }, []);

  let entries: ReorderableEntry<PluginData>[] = [];

  useEffect(() => {
    entries = plugins.map((plugin) => {
      return {
        label: plugin.name,
        data: {
          update: updates?.get(plugin.name),
          version: plugin.version,
        },
        position: pluginOrder.indexOf(plugin.name),
      };
    });
  }, [plugins, updates]);

  if (plugins.length === 0) {
    return (
      <div>
        <p>No plugins installed</p>
      </div>
    );
  }

  async function onSave(entries: ReorderableEntry<PluginData>[]) {
    await setPluginOrder(entries.map((entry) => entry.label));
  }

  return (
    <DialogBody>
      <DialogControlsSection>
        <ReorderableList<PluginData> entries={entries} onSave={onSave} interactables={PluginInteractables} />
      </DialogControlsSection>
    </DialogBody>
  );
}
