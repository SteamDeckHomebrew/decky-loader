import { DialogBody, DialogControlsSection, DialogControlsSectionHeader, Field, Toggle } from '@decky/ui';
import { useTranslation } from 'react-i18next';

import { useSetting } from '../../../../utils/hooks/useSetting';
import { useDeckyState } from '../../../DeckyState';
import BranchSelect from './BranchSelect';
import NotificationSettings from './NotificationSettings';
import StoreSelect from './StoreSelect';
import UpdaterSettings from './Updater';

export default function GeneralSettings({
  isDeveloper,
  setIsDeveloper,
}: {
  isDeveloper: boolean;
  setIsDeveloper: (val: boolean) => void;
}) {
  const { versionInfo, sortPlugins, setSortPlugins } = useDeckyState();
  const [_, setSortPluginsSetting] = useSetting<boolean>('sortPlugins', false);
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
        <DialogControlsSectionHeader>{t('SettingsGeneralIndex.notifications.header')}</DialogControlsSectionHeader>
        <NotificationSettings />
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>{t('SettingsGeneralIndex.other.header')}</DialogControlsSectionHeader>
        <Field label={t('SettingsGeneralIndex.developer_mode.label')}>
          <Toggle
            value={isDeveloper}
            onChange={(toggleValue) => {
              setIsDeveloper(toggleValue);
            }}
          />
        </Field>
        <Field label={t('SettingsGeneralIndex.sort_plugins.label')}>
          <Toggle
            value={sortPlugins}
            onChange={(toggleValue) => {
              setSortPlugins(toggleValue);
              setSortPluginsSetting(toggleValue);
            }}
          />
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
