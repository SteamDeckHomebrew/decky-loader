import { DialogButton, Field, TextField } from 'decky-frontend-lib';
import { FaTrash } from 'react-icons/fa';

import { useDeckyState } from '../../DeckyState';

export default function PluginList() {
  const { plugins } = useDeckyState();

  if (plugins === []) {
    plugins.push({ icon: '', name: 'bobby', content: '' });
    plugins.push({ icon: '', name: 'johjy', content: '' });
  }

  return (
    <ul>
      {plugins.map(({ name }) => (
        <li>
          <span className="plugin-name">{name}</span>
          <DialogButton onClick={() => window.DeckyPluginLoader.uninstall_plugin(name)}>
            <FaTrash />
          </DialogButton>
        </li>
      ))}
    </ul>
  );
}
