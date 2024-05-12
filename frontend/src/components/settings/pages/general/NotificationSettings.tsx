import { Field, Toggle } from '@decky/ui';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { useDeckyState } from '../../../DeckyState';

const NotificationSettings: FC = () => {
  const { notificationSettings } = useDeckyState();
  const notificationService = DeckyPluginLoader.notificationService;

  const { t } = useTranslation();

  return (
    <>
      <Field label={t('SettingsGeneralIndex.notifications.decky_updates_label')}>
        <Toggle
          value={notificationSettings.deckyUpdates}
          onChange={(deckyUpdates) => {
            notificationService.update({ ...notificationSettings, deckyUpdates });
          }}
        />
      </Field>
      <Field label={t('SettingsGeneralIndex.notifications.plugin_updates_label')}>
        <Toggle
          value={notificationSettings.pluginUpdates}
          onChange={(pluginUpdates) => {
            notificationService.update({ ...notificationSettings, pluginUpdates });
          }}
        />
      </Field>
    </>
  );
};

export default NotificationSettings;
