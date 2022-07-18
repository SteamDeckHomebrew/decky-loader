import { DialogButton, staticClasses } from 'decky-frontend-lib';
import { FaTrash, FaUndo } from 'react-icons/fa';

import { useDeckyState } from '../../../DeckyState';

export default function PluginList() {
  const { plugins } = useDeckyState();

  if (plugins.length === 0) {
    return (
      <div>
        <DialogButton
          style={{
            marginTop: '-41px',
            marginLeft: 'auto',
            height: '40px',
            width: '40px',
            minWidth: 0,
            padding: '10px 12px',
          }}
          onClick={async () => await window.DeckyPluginLoader.refreshPlugins()}
        >
          <FaUndo style={{ marginTop: '-4px', display: 'block' }} />
        </DialogButton>
        <div>
          <span>No plugins installed</span>
        </div>
      </div>
    );
  }

  return (
    </ul>
    <div>
      <DialogButton
        style={{
          marginTop: '-41px',
          marginLeft: 'auto',
          height: '40px',
          width: '40px',
          minWidth: 0,
          padding: '10px 12px',
        }}
        onClick={async () => await window.DeckyPluginLoader.refreshPlugins()}
      >
        <FaUndo style={{ marginTop: '-4px', display: 'block' }} />
      </DialogButton>
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
    </div>
  );
}
