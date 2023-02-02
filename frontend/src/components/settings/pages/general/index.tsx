import {
  DialogBody,
  DialogButton,
  DialogControlsSection,
  DialogControlsSectionHeader,
  Field,
  TextField,
  Toggle,
} from 'decky-frontend-lib';
import { useState } from 'react';

import { installFromURL } from '../../../../store';
import { useDeckyState } from '../../../DeckyState';
import BranchSelect from './BranchSelect';
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
  const { versionInfo } = useDeckyState();

  return (
    <DialogBody>
      <DialogControlsSection>
        <DialogControlsSectionHeader>Updates</DialogControlsSectionHeader>
        <UpdaterSettings />
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>Beta Participation</DialogControlsSectionHeader>
        <BranchSelect />
        <StoreSelect />
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>Other</DialogControlsSectionHeader>
        <Field label="Enable Developer Mode">
          <Toggle
            value={isDeveloper}
            onChange={(toggleValue) => {
              setIsDeveloper(toggleValue);
            }}
          />
        </Field>
        <Field
          label="Install plugin from URL"
          description={<TextField label={'URL'} value={pluginURL} onChange={(e) => setPluginURL(e?.target.value)} />}
        >
          <DialogButton disabled={pluginURL.length == 0} onClick={() => installFromURL(pluginURL)}>
            Install
          </DialogButton>
        </Field>
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>About</DialogControlsSectionHeader>
        <Field label="Decky Version" focusable={true}>
          <div style={{ color: 'var(--gpSystemLighterGrey)' }}>{versionInfo?.current}</div>
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
}
