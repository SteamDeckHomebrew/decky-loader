import { DialogBody, DialogControlsSection, DialogControlsSectionHeader, Field, Toggle } from 'decky-frontend-lib';

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
