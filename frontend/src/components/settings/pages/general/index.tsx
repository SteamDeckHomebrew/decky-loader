import { DialogButton, Field, TextField, Toggle } from 'decky-frontend-lib';
import { useState } from 'react';
import { FaShapes, FaTools } from 'react-icons/fa';

import { installFromURL } from '../../../../store';
import BranchSelect from './BranchSelect';
import RemoteDebuggingSettings from './RemoteDebugging';
import StoreSelect from './StoreSelect';
import UpdaterSettings from './Updater';

export default function GeneralSettings({
  isDeveloper,
  setIsDeveloper,
}: {
  isDeveloper: boolean;
  setIsDeveloper: (val: boolean) => void;
}) {
  const [pluginURL, setPluginURL] = useState('');

  return (
    <div>
      <UpdaterSettings />
      <BranchSelect />
      <StoreSelect />
      <RemoteDebuggingSettings />
      <Field
        label="Developer mode"
        description={<span style={{ whiteSpace: 'pre-line' }}>Enables Decky's developer settings.</span>}
        icon={<FaTools style={{ display: 'block' }} />}
      >
        <Toggle
          value={isDeveloper}
          onChange={(toggleValue) => {
            setIsDeveloper(toggleValue);
          }}
        />
      </Field>
      <Field
        label="Manual plugin install"
        description={<TextField label={'URL'} value={pluginURL} onChange={(e) => setPluginURL(e?.target.value)} />}
        icon={<FaShapes style={{ display: 'block' }} />}
      >
        <DialogButton disabled={pluginURL.length == 0} onClick={() => installFromURL(pluginURL)}>
          Install
        </DialogButton>
      </Field>
    </div>
  );
}
