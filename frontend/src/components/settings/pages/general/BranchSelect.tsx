import { Dropdown, Field } from 'decky-frontend-lib';
import { FunctionComponent } from 'react';

import { useSetting } from '../../../../utils/hooks/useSetting';

enum UpdateBranch {
  Stable,
  Prerelease,
  Nightly,
}

const BranchSelect: FunctionComponent<{}> = () => {
  const [selectedBranch, setSelectedBranch] = useSetting<UpdateBranch>('branch', UpdateBranch.Prerelease);

  return (
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
        }}
      />
    </Field>
  );
};

export default BranchSelect;
