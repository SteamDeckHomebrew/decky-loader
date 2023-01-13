import { DialogButton, Focusable, Menu, MenuItem, showContextMenu } from 'decky-frontend-lib';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaEllipsisH } from 'react-icons/fa';

import { requestPluginInstall } from '../../../../store';
import { useDeckyState } from '../../../DeckyState';

export default function PluginList() {
  const { plugins, updates } = useDeckyState();
  const { t } = useTranslation('PluginListIndex');

  useEffect(() => {
    window.DeckyPluginLoader.checkPluginUpdates();
  }, []);

  if (plugins.length === 0) {
    return (
      <div>
        <p>{t('list_no_plugin')}</p>
      </div>
    );
  }

  return (
    <ul style={{ listStyleType: 'none' }}>
      {plugins.map(({ name, version }) => {
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
                    {t('list_update_to', update.name)}
                    <FaDownload style={{ paddingLeft: '2rem' }} />
                  </div>
                </DialogButton>
              )}
              <DialogButton
                style={{ height: '40px', width: '40px', padding: '10px 12px', minWidth: '40px' }}
                onClick={(e: MouseEvent) =>
                  showContextMenu(
                    <Menu label={t('list_plug_actions_label')}>
                      <MenuItem onSelected={() => window.DeckyPluginLoader.importPlugin(name, version)}>
                        {t('reload')}
                      </MenuItem>
                      <MenuItem onSelected={() => window.DeckyPluginLoader.uninstallPlugin(name)}>
                        {t('uninstall')}
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
  );
}
