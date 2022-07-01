import { DialogButton, Field, TextField } from 'decky-frontend-lib';
import { FaTrash } from 'react-icons/fa';

export default function PluginList() {
  const plugins = window.DeckyPluginLoader.getPlugins();

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
