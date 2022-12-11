import { DialogButton, Focusable, Menu, MenuItem, showContextMenu } from 'decky-frontend-lib';
import { useEffect } from 'react';
import { FaDownload, FaEllipsisH } from 'react-icons/fa';

import { requestPluginInstall } from '../../../../store';
import { useOrderedPlugins } from '../../../../utils/hooks/useOrderedPlugins';
import { useDeckyState } from '../../../DeckyState';

export default function PluginList() {
  const { updates } = useDeckyState();
  const { orderedPlugins, movePlugin } = useOrderedPlugins();

  useEffect(() => {
    window.DeckyPluginLoader.checkPluginUpdates();
  }, []);

  if (orderedPlugins.length === 0) {
    return (
      <div>
        <p>No plugins installed</p>
      </div>
    );
  }

  return (
    <ul style={{ listStyleType: 'none' }}>
      {orderedPlugins.map(({ name, version }, index) => {
        const update = updates?.get(name);
        return (
          <li style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', paddingBottom: '10px' }}>
            <span>
              {name} {version}
            </span>
            <Focusable style={{ marginLeft: 'auto', boxShadow: 'none', display: 'flex', justifyContent: 'right' }}>
              {update && (
                <DialogButton
                  style={{ height: '40px', minWidth: '60px', marginRight: '10px' }}
                  onClick={() => requestPluginInstall(name, update)}
                >
                  <div style={{ display: 'flex', flexDirection: 'row' }}>
                    Update to {update.name}
                    <FaDownload style={{ paddingLeft: '2rem' }} />
                  </div>
                </DialogButton>
              )}
              <DialogButton
                style={{ height: '40px', width: '40px', padding: '10px 12px', minWidth: '40px' }}
                onClick={(e: MouseEvent) =>
                  showContextMenu(
                    <Menu label="Plugin Actions">
                      <MenuItem onSelected={() => window.DeckyPluginLoader.importPlugin(name, version)}>
                        Reload
                      </MenuItem>
                      <MenuItem disabled={index == 0} onSelected={() => movePlugin(name, 'top')}>
                        Move To Top
                      </MenuItem>
                      <MenuItem disabled={index == 0} onSelected={() => movePlugin(name, 'up')}>
                        Move Up
                      </MenuItem>
                      <MenuItem
                        disabled={index == orderedPlugins.length - 1}
                        onSelected={() => movePlugin(name, 'down')}
                      >
                        Move Down
                      </MenuItem>
                      <MenuItem
                        disabled={index == orderedPlugins.length - 1}
                        onSelected={() => movePlugin(name, 'bottom')}
                      >
                        Move To Bottom
                      </MenuItem>
                      <MenuItem onSelected={() => window.DeckyPluginLoader.uninstallPlugin(name)}>Uninstall</MenuItem>
                    </Menu>,
                    e.currentTarget ?? window,
                  )
                }
              >
                <FaEllipsisH />
              </DialogButton>
            </Focusable>
          </li>
        );
      })}
    </ul>
  );
}
