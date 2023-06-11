import { Field, Toggle } from 'decky-frontend-lib';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { useDeckyState } from '../../../DeckyState';

const NotificationSettings: FC = () => {
  const { notifiationSettings } = useDeckyState();
  const notifiationService = window.DeckyPluginLoader.notificationService;

  const { t } = useTranslation();

  return (
    <>
      <Field label={t('SettingsGeneralIndex.notifications.decky_updates_label')}>
        <Toggle
          value={notifiationSettings.deckyUpdates}
          onChange={(deckyUpdates) => {
            notifiationService.update({ ...notifiationSettings, deckyUpdates });
          }}
        />
      </Field>
      <Field label={t('SettingsGeneralIndex.notifications.plugin_updates_label')}>
        <Toggle
          value={notifiationSettings.pluginUpdates}
          onChange={(pluginUpdates) => {
            notifiationService.update({ ...notifiationSettings, pluginUpdates });
          }}
        />
      </Field>
    </>
  );
};

export default NotificationSettings;
