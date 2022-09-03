import { DialogButton, Field, Menu, MenuItem, showContextMenu } from 'decky-frontend-lib';
import { useState } from 'react';
import { FaTrashAlt } from 'react-icons/fa';

export default function UninstallSettings() {
  const [keepPlugins, setKeepPlugins] = useState<boolean>(true);

  return (
    <Field
      label="Uninstall Decky"
      description={<span style={{ whiteSpace: 'pre-line' }}>Remove Decky from this Steam Deck</span>}
      icon={<FaTrashAlt style={{ display: 'block', fill: '#d92626' }} />}
    >
      <DialogButton
        onClick={async (e: MouseEvent) => {
          showContextMenu(
            <Menu label="Do you want to keep your plugins?">
              <MenuItem onSelected={() => setKeepPlugins(true)}>Yes</MenuItem>
              <MenuItem onSelected={() => setKeepPlugins(false)}>No</MenuItem>
            </Menu>,
            e.currentTarget ?? window,
          );
          await window.DeckyPluginLoader._uninstallDecky(keepPlugins);
        }}
        style={{ marginLeft: 'auto' }}
      >
        Uninstall
      </DialogButton>
    </Field>
  );
}
