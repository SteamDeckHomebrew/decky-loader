import { Field, Toggle } from 'decky-frontend-lib';
import { useTranslation } from 'react-i18next';
import { FaBug } from 'react-icons/fa';

import { useSetting } from '../../../../utils/hooks/useSetting';

export default function RemoteDebuggingSettings() {
  const [allowRemoteDebugging, setAllowRemoteDebugging] = useSetting<boolean>('cef_forward', false);
  const { t } = useTranslation('RemoteDebugging');

  return (
    <Field
      label={t('remote_cef_label')}
      description={
        <span style={{ whiteSpace: 'pre-line' }}>
          {t('remote_cef_desc')}
        </span>
      }
      icon={<FaBug style={{ display: 'block' }} />}
    >
      <Toggle
        value={allowRemoteDebugging || false}
        onChange={(toggleValue) => {
          setAllowRemoteDebugging(toggleValue);
          if (toggleValue) window.DeckyPluginLoader.callServerMethod('allow_remote_debugging');
          else window.DeckyPluginLoader.callServerMethod('disallow_remote_debugging');
        }}
      />
    </Field>
  );
}
