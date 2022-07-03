import { DialogButton, staticClasses } from 'decky-frontend-lib';
import { VFC } from 'react';
import { FaTrash } from 'react-icons/fa';

import { useDeckyState } from '../../DeckyState';

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
              onClick={() => window.DeckyPluginLoader.uninstall_plugin(name)}
            >
              <FaTrash />
            </DialogButton>
          </div>
        </li>
      ))}
    </ul>
  );
}
