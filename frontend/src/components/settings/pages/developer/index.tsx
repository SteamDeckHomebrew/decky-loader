import { Field, Focusable, TextField, Toggle } from 'decky-frontend-lib';
import { useRef } from 'react';
import { FaReact, FaSteamSymbol } from 'react-icons/fa';

import { setShouldConnectToReactDevTools, setShowValveInternal } from '../../../../developer';
import { useSetting } from '../../../../utils/hooks/useSetting';

export default function DeveloperSettings() {
  const [enableValveInternal, setEnableValveInternal] = useSetting<boolean>('developer.valve_internal', false);
  const [reactDevtoolsEnabled, setReactDevtoolsEnabled] = useSetting<boolean>('developer.rdt.enabled', false);
  const [reactDevtoolsIP, setReactDevtoolsIP] = useSetting<string>('developer.rdt.ip', '');
  const textRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <Field
        label="Enable Valve Internal"
        description={
          <span style={{ whiteSpace: 'pre-line' }}>
            Enables the Valve internal developer menu.{' '}
            <span style={{ color: 'red' }}>Do not touch anything in this menu unless you know what it does.</span>
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
      </Field>{' '}
      <Focusable
        onTouchEnd={
          reactDevtoolsIP == ''
            ? () => {
                (textRef.current?.childNodes[0] as HTMLInputElement)?.focus();
              }
            : undefined
        }
        onClick={
          reactDevtoolsIP == ''
            ? () => {
                (textRef.current?.childNodes[0] as HTMLInputElement)?.focus();
              }
            : undefined
        }
        onOKButton={
          reactDevtoolsIP == ''
            ? () => {
                (textRef.current?.childNodes[0] as HTMLInputElement)?.focus();
              }
            : undefined
        }
      >
        <Field
          label="Enable React DevTools"
          description={
            <>
              <span style={{ whiteSpace: 'pre-line' }}>
                Enables connection to a computer running React DevTools. Changing this setting will reload Steam. Set
                the IP address before enabling.
              </span>
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
      </Focusable>
    </>
  );
}
