import { DialogBody, DialogButton, DialogControlsSection, DialogControlsSectionHeader, Field, Toggle } from '@decky/ui';
import { useTranslation } from 'react-i18next';

import { getSetting } from '../../../../utils/settings';
import Logger from '../../../../logger';
import { FileSelectionType } from '../../../modals/filepicker';
import { useDeckyState } from '../../../DeckyState';
import BranchSelect from './BranchSelect';
import NotificationSettings from './NotificationSettings';
import StoreSelect from './StoreSelect';
import UpdaterSettings from './Updater';

const logger = new Logger('GeneralSettings');

const exportSettings = DeckyBackend.callable<[destination_path: string], { path: string; size: number }>(
  'utilities/export_settings',
);
const importSettings = DeckyBackend.callable<[zip_path: string], { restored_count: number; files: string[] }>(
  'utilities/import_settings',
);

export default function GeneralSettings({
  isDeveloper,
  setIsDeveloper,
}: {
  isDeveloper: boolean;
  setIsDeveloper: (val: boolean) => void;
}) {
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
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>{t('SettingsGeneralIndex.backup.header')}</DialogControlsSectionHeader>
        <Field label={t('SettingsGeneralIndex.backup.export_label')}>
          <DialogButton
            onClick={async () => {
              const homePath = await getSetting<string>('user_info.user_home', '');
              if (!homePath) {
                logger.error('Could not determine home path');
                return;
              }
              DeckyPluginLoader.openFilePicker(
                FileSelectionType.FOLDER,
                homePath,
                true,
                true,
                undefined,
                undefined,
                false,
                false,
              ).then(async (val) => {
                try {
                  const result = await exportSettings(val.path);
                  DeckyPluginLoader.toaster.toast({
                    title: t('SettingsGeneralIndex.backup.export_success'),
                    body: result.path,
                  });
                } catch (e) {
                  logger.error('Export failed', e);
                  DeckyPluginLoader.toaster.toast({
                    title: t('SettingsGeneralIndex.backup.export_error'),
                    body: String(e),
                  });
                }
              });
            }}
          >
            {t('SettingsGeneralIndex.backup.export_button')}
          </DialogButton>
        </Field>
        <Field label={t('SettingsGeneralIndex.backup.import_label')}>
          <DialogButton
            onClick={async () => {
              const homePath = await getSetting<string>('user_info.user_home', '');
              if (!homePath) {
                logger.error('Could not determine home path');
                return;
              }
              DeckyPluginLoader.openFilePicker(
                FileSelectionType.FILE,
                homePath,
                true,
                true,
                undefined,
                ['zip'],
                false,
                false,
              ).then(async (val) => {
                try {
                  const result = await importSettings(val.path);
                  DeckyPluginLoader.toaster.toast({
                    title: t('SettingsGeneralIndex.backup.import_success'),
                    body: t('SettingsGeneralIndex.backup.import_count', { count: result.restored_count }),
                  });
                } catch (e) {
                  logger.error('Import failed', e);
                  DeckyPluginLoader.toaster.toast({
                    title: t('SettingsGeneralIndex.backup.import_error'),
                    body: String(e),
                  });
                }
              });
            }}
          >
            {t('SettingsGeneralIndex.backup.import_button')}
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
