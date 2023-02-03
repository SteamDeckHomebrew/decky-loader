import { DialogBody, Field, TextField, Toggle } from 'decky-frontend-lib';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaReact, FaSteamSymbol } from 'react-icons/fa';

import { setShouldConnectToReactDevTools, setShowValveInternal } from '../../../../developer';
import { useSetting } from '../../../../utils/hooks/useSetting';
import RemoteDebuggingSettings from '../general/RemoteDebugging';

export default function DeveloperSettings() {
  const [enableValveInternal, setEnableValveInternal] = useSetting<boolean>('developer.valve_internal', false);
  const [reactDevtoolsEnabled, setReactDevtoolsEnabled] = useSetting<boolean>('developer.rdt.enabled', false);
  const [reactDevtoolsIP, setReactDevtoolsIP] = useSetting<string>('developer.rdt.ip', '');
  const textRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  return (
    <DialogBody>
      <RemoteDebuggingSettings />
      <Field
        label={t('DeveloperIndex.valve_internal.label')}
        description={
          <span style={{ whiteSpace: 'pre-line' }}>
            {t('DeveloperIndex.valve_internal.desc1')}{' '}
            <span style={{ color: 'red' }}>{t('DeveloperIndex.valve_internal.desc2')}</span>
          </span>
        }
        icon={<FaSteamSymbol style={{ display: 'block' }} />}
      >
        <Toggle
          value={enableValveInternal}
          onChange={(toggleValue) => {
            setEnableValveInternal(toggleValue);
            setShowValveInternal(toggleValue);
          }}
        />
      </Field>
      <Field
        label={t('DeveloperIndex.react_devtools.label')}
        description={
          <>
            <span style={{ whiteSpace: 'pre-line' }}>{t('DeveloperIndex.react_devtools.desc')}</span>
            <br />
            <br />
            <div ref={textRef}>
              <TextField label={'IP'} value={reactDevtoolsIP} onChange={(e) => setReactDevtoolsIP(e?.target.value)} />
            </div>
          </>
        }
        icon={<FaReact style={{ display: 'block' }} />}
      >
        <Toggle
          value={reactDevtoolsEnabled}
          disabled={reactDevtoolsIP == ''}
          onChange={(toggleValue) => {
            setReactDevtoolsEnabled(toggleValue);
            setShouldConnectToReactDevTools(toggleValue);
          }}
        />
      </Field>
    </DialogBody>
  );
}
