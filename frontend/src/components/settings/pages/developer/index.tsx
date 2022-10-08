import { Field, Toggle } from 'decky-frontend-lib';
import { FaSteamSymbol } from 'react-icons/fa';

import { setShowValveInternal } from '../../../../developer';
import { useSetting } from '../../../../utils/hooks/useSetting';

export default function DeveloperSettings() {
  const [enableValveInternal, setEnableValveInternal] = useSetting<boolean>('developer.valve_internal', false);
  // const [reactDevtoolsEnabled, setReactDevtoolsEnabled] = useSetting<boolean>('developer.rdt.enabled', false);
  // const [reactDevtoolsIP, setReactDevtoolsIP] = useSetting<string>('developer.rdt.ip', '');

  return (
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
        value={enableValveInternal || false}
        onChange={(toggleValue) => {
          setEnableValveInternal(toggleValue);
          setShowValveInternal(toggleValue);
        }}
      />
    </Field>
  );
}
