import {
  DialogBody,
  DialogButton,
  DialogControlsSection,
  Focusable,
  Menu,
  MenuItem,
  showContextMenu,
} from 'decky-frontend-lib';
import { useEffect } from 'react';
import { FaDownload, FaEllipsisH } from 'react-icons/fa';

import { requestPluginInstall } from '../../../../store';
import { useSetting } from '../../../../utils/hooks/useSetting';
import { useDeckyState } from '../../../DeckyState';

export default function PluginList() {
  const { plugins, updates } = useDeckyState();
  const [pluginOrder, setPluginOrder] = useSetting(
    'pluginOrder',
    plugins.map((plugin) => plugin.name),
  );

  useEffect(() => {
    window.DeckyPluginLoader.checkPluginUpdates();
  }, []);

  if (plugins.length === 0) {
    return (
      <div>
        <p>No plugins installed</p>
      </div>
    );
  }

  return (
    <DialogBody>
      <DialogControlsSection>
        <ul style={{ listStyleType: 'none', padding: '0' }}>
          {plugins
            .sort((a, b) => pluginOrder.indexOf(a.name) - pluginOrder.indexOf(b.name))
            .map(({ name, version }) => {
              const update = updates?.get(name);
              return (
                <li style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', paddingBottom: '10px' }}>
                  <span>
                    {name} <span style={{ opacity: '50%' }}>{'(' + version + ')'}</span>
                  </span>
                  <Focusable
                    style={{ marginLeft: 'auto', boxShadow: 'none', display: 'flex', justifyContent: 'right' }}
                  >
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
                            <MenuItem onSelected={() => window.DeckyPluginLoader.uninstallPlugin(name)}>
                              Uninstall
                            </MenuItem>
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
      </DialogControlsSection>
    </DialogBody>
  );
}
