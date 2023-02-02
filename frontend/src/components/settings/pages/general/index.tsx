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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  return (
    <DialogBody>
      <DialogControlsSection>
        <DialogControlsSectionHeader>{t('SettingsGeneralIndex.updates.header')}</DialogControlsSectionHeader>
        <UpdaterSettings />
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>{t('SettingsGeneralIndex.beta.header')}</DialogControlsSectionHeader>
        <BranchSelect />
        <StoreSelect />
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>Other</DialogControlsSectionHeader>
        <Field label={t('SettingsGeneralIndex.developer_mode.label')}>
          <Toggle
            value={isDeveloper}
            onChange={(toggleValue) => {
              setIsDeveloper(toggleValue);
            }}
          />
        </Field>
        <Field
          label={t('SettingsGeneralIndex.manual_plugin.label')}
          description={<TextField label={'URL'} value={pluginURL} onChange={(e) => setPluginURL(e?.target.value)} />}
        >
          <DialogButton disabled={pluginURL.length == 0} onClick={() => installFromURL(pluginURL)}>
            {t('SettingsGeneralIndex.manual_plugin.button')}
          </DialogButton>
        </Field>
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>{t('SettingsGeneralIndex.about.header')}</DialogControlsSectionHeader>
        <Field label={t('SettingsGeneralIndex.about.decky_version')} focusable={true}>
          <div style={{ color: 'var(--gpSystemLighterGrey)' }}>{versionInfo?.current}</div>
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
}
