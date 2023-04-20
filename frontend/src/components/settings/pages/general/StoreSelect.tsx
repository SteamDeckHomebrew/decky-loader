import { Dropdown, Field, TextField } from 'decky-frontend-lib';
import { FunctionComponent } from 'react';
import { useTranslation } from 'react-i18next';
import { FaShapes } from 'react-icons/fa';

import Logger from '../../../../logger';
import { Store } from '../../../../store';
import { useSetting } from '../../../../utils/hooks/useSetting';

const logger = new Logger('StoreSelect');

const StoreSelect: FunctionComponent<{}> = () => {
  const [selectedStore, setSelectedStore] = useSetting<Store>('store', Store.Default);
  const [selectedStoreURL, setSelectedStoreURL] = useSetting<string | null>('store-url', null);
  const { t } = useTranslation();

  // Returns numerical values from 0 to 2 (with current branch setup as of 8/28/22)
  // 0 being Default, 1 being Testing and 2 being Custom
  return (
    <>
      <Field label={t('StoreSelect.store_channel.label')} childrenContainerWidth={'fixed'}>
        <Dropdown
          rgOptions={Object.values(Store)
            .filter((store) => typeof store == 'string')
            .map((store) => ({
              label: () => {
                switch (Store[store]) {
                  case Store.Default:
                    return t('StoreSelect.store_channel.default');
                  case Store.Testing:
                    return t('StoreSelect.store_channel.testing');
                  case Store.Custom:
                    return t('StoreSelect.store_channel.custom');
                  default:
                    return '';
                }
              },
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
          label={t('StoreSelect.custom_store.label')}
          indentLevel={1}
          description={
            <TextField
              label={t('StoreSelect.custom_store.url_label')}
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
