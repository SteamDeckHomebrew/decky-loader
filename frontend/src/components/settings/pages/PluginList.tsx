import { DialogButton, Field, TextField } from 'decky-frontend-lib';
import { FaTrash } from 'react-icons/fa';

import { useDeckyState } from '../../DeckyState';
import { uninstall } from '../../store/Store';

export default function GeneralSettings() {
  const { plugins } = useDeckyState();

  return (
    <ul>
      {plugins.map(({ name }) => (
        <li>
          <span className="plugin-name">{name}</span>
          <DialogButton onClick={() => uninstall(name)}>
            <FaTrash />
          </DialogButton>
        </li>
      ))}
    </ul>
  );
}
