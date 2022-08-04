import { DialogButton, Menu, MenuItem, showContextMenu, staticClasses } from 'decky-frontend-lib';
import { FaEllipsisH } from 'react-icons/fa';

import { useDeckyState } from '../../../DeckyState';

export default function PluginList() {
  const { plugins } = useDeckyState();

  if (plugins.length === 0) {
    return (
      <div>
        <p>No plugins installed</p>
      </div>
    );
  }

  return (
    <ul style={{ listStyleType: 'none' }}>
      {plugins.map(({ name }) => (
        <li style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <span>{name}</span>
          <div className={staticClasses.Title} style={{ marginLeft: 'auto', boxShadow: 'none' }}>
            <DialogButton
              style={{ height: '40px', width: '40px', padding: '10px 12px' }}
              onClick={(e: MouseEvent) =>
                showContextMenu(
                  <Menu label="Plugin Actions">
                    <MenuItem onSelected={() => window.DeckyPluginLoader.importPlugin(name)}>Reload</MenuItem>
                    <MenuItem onSelected={() => window.DeckyPluginLoader.uninstallPlugin(name)}>Uninstall</MenuItem>
                  </Menu>,
                  e.currentTarget ?? window,
                )
              }
            >
              <FaEllipsisH />
            </DialogButton>
          </div>
        </li>
      ))}
    </ul>
  );
}
