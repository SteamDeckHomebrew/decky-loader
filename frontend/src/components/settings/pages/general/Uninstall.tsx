import { DialogButton, Field, Menu, MenuItem, showContextMenu } from 'decky-frontend-lib';
import { FaTrashAlt } from 'react-icons/fa';

export default function UninstallSettings() {
  return (
    <Field
      label="Uninstall Decky"
      description={<span style={{ whiteSpace: 'pre-line' }}>Remove Decky from this Steam Deck</span>}
      icon={<FaTrashAlt style={{ display: 'block', fill: '#d92626' }} />}
    >
      <DialogButton
        onClick={(e: MouseEvent) =>
          showContextMenu(
            <Menu label="Do you want to keep your plugins?">
              <MenuItem onSelected={async () => await window.DeckyPluginLoader._uninstallDecky(true)}>Yes</MenuItem>
              <MenuItem onSelected={async () => await window.DeckyPluginLoader._uninstallDecky(false)}>No</MenuItem>
            </Menu>,
            e.currentTarget ?? window,
          )
        }
        style={{ marginLeft: 'auto' }}
      >
        Uninstall
      </DialogButton>
    </Field>
  );
}
