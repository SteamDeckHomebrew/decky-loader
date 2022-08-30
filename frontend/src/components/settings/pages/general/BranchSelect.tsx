import { Dropdown, Field } from 'decky-frontend-lib';
import { FunctionComponent } from 'react';

import { callUpdaterMethod } from '../../../../updater';
import { useSetting } from '../../../../utils/hooks/useSetting';

enum UpdateBranch {
  Stable,
  Prerelease,
  Nightly,
}

const BranchSelect: FunctionComponent<{}> = () => {
  const [selectedBranch, setSelectedBranch] = useSetting<UpdateBranch>('branch', UpdateBranch.Prerelease);

  return (
    // Returns numerical values from 0 to 2 (with current branch setup as of 8/28/22)
    // 0 being stable, 1 being pre-release and 2 being nightly
    <Field label="Update Channel">
      <Dropdown
        rgOptions={Object.values(UpdateBranch)
          .filter((branch) => typeof branch == 'string')
          .map((branch) => ({
            label: branch,
            data: UpdateBranch[branch],
          }))}
        selectedOption={selectedBranch}
        onChange={(newVal) => {
          setSelectedBranch(newVal.data);
          callUpdaterMethod('check_for_updates');
          console.log('switching branches!');
        }}
      />
    </Field>
  );
};

export default BranchSelect;
