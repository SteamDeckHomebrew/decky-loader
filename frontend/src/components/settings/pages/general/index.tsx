import { DialogButton, Field, TextField } from 'decky-frontend-lib';
import { useState } from 'react';
import { FaShapes } from 'react-icons/fa';

import { installFromURL } from '../../../../store';
import BranchSelect from './BranchSelect';
import RemoteDebuggingSettings from './RemoteDebugging';
import UninstallSettings from './Uninstall';
import UpdaterSettings from './Updater';

export default function GeneralSettings() {
  const [pluginURL, setPluginURL] = useState('');
  // const [checked, setChecked] = useState(false); // store these in some kind of State instead
  return (
    <div>
      {/* <Field
        label="A Toggle with an icon"
        icon={<FaShapes style={{ display: 'block' }} />}
      >
        <Toggle
          value={checked}
          onChange={(e) => setChecked(e)}
        />
      </Field> */}
      <UpdaterSettings />
      <BranchSelect />
      <RemoteDebuggingSettings />
      <Field
        label="Manual plugin install"
        description={<TextField label={'URL'} value={pluginURL} onChange={(e) => setPluginURL(e?.target.value)} />}
        icon={<FaShapes style={{ display: 'block' }} />}
      >
        <DialogButton disabled={pluginURL.length == 0} onClick={() => installFromURL(pluginURL)}>
          Install
        </DialogButton>
      </Field>
      <UninstallSettings />
    </div>
  );
}
