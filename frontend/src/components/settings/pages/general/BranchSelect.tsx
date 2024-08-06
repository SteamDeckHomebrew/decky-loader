import { Dropdown, Field } from '@decky/ui';
import { FunctionComponent } from 'react';
import { useTranslation } from 'react-i18next';

import Logger from '../../../../logger';
import { checkForUpdates } from '../../../../updater';
import { useSetting } from '../../../../utils/hooks/useSetting';

const logger = new Logger('BranchSelect');

export enum UpdateBranch {
  Stable,
  Prerelease,
  Testing,
}

enum LessUpdateBranch {
  Stable,
  Prerelease,
}

const BranchSelect: FunctionComponent<{}> = () => {
  const { t } = useTranslation();
  const tBranches = [
    t('BranchSelect.update_channel.stable'),
    t('BranchSelect.update_channel.prerelease'),
    t('BranchSelect.update_channel.testing'),
  ];
  const [selectedBranch, setSelectedBranch] = useSetting<UpdateBranch>('branch', UpdateBranch.Stable);

  return (
    // Returns numerical values from 0 to 2 (with current branch setup as of 6/16/23)
    // 0 being stable, 1 being pre-release and 2 being testing (not a branch!)
    <Field label={t('BranchSelect.update_channel.label')} childrenContainerWidth={'fixed'}>
      <Dropdown
        rgOptions={Object.values(selectedBranch == UpdateBranch.Testing ? UpdateBranch : LessUpdateBranch)
          .filter((branch) => typeof branch == 'number')
          .map((branch) => ({
            label: tBranches[branch as number],
            data: branch,
          }))}
        selectedOption={selectedBranch}
        onChange={async (newVal) => {
          await setSelectedBranch(newVal.data);
          checkForUpdates();
          logger.log('switching branches!');
        }}
      />
    </Field>
  );
};

export default BranchSelect;
