import { Dropdown, Field, TextField } from 'decky-frontend-lib';
import { FunctionComponent } from 'react';
import { FaShapes } from 'react-icons/fa';

import Logger from '../../../../logger';
import { Store } from '../../../../store';
import { useSetting } from '../../../../utils/hooks/useSetting';

const logger = new Logger('StoreSelect');

const StoreSelect: FunctionComponent<{}> = () => {
  const [selectedStore, setSelectedStore] = useSetting<Store>('store', Store.Default);
  const [selectedStoreURL, setSelectedStoreURL] = useSetting<string | null>('store-url', null);

  // Returns numerical values from 0 to 2 (with current branch setup as of 8/28/22)
  // 0 being Default, 1 being Testing and 2 being Custom
  return (
    <>
      <Field label="Plugin Store Channel" childrenContainerWidth={'fixed'}>
        <Dropdown
          rgOptions={Object.values(Store)
            .filter((store) => typeof store == 'string')
            .map((store) => ({
              label: store,
              data: Store[store],
            }))}
          selectedOption={selectedStore}
          onChange={async (newVal) => {
            await setSelectedStore(newVal.data);
            logger.log('switching stores!');
          }}
        />
      </Field>
      {selectedStore == Store.Custom && (
        <Field
          label="Custom Store"
          indentLevel={1}
          description={
            <TextField
              label={'URL'}
              value={selectedStoreURL || undefined}
              onChange={(e) => setSelectedStoreURL(e?.target.value || null)}
            />
          }
          icon={<FaShapes style={{ display: 'block' }} />}
        ></Field>
      )}
    </>
  );
};

export default StoreSelect;
