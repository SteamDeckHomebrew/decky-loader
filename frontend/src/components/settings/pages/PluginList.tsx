import { DialogButton, Field, TextField } from 'decky-frontend-lib';
import { FaTrash } from 'react-icons/fa';

import { uninstall } from '../../store/Store';
import { useDeckyState } from '../../DeckyState';

export default function GeneralSettings() {
  const { plugins } = useDeckyState();

  return (
    <ul>
      {plugins.map(({ name }) => (
        <li>
          <span className="plugin-name">{ name }</span>
          <DialogButton onClick={() => uninstall(name)}><FaTrash /></DialogButton>
        </li>
      ))}
    </ul>
  );
}
