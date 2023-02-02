import { Field, Toggle } from 'decky-frontend-lib';
import { FaChrome } from 'react-icons/fa';

import { useSetting } from '../../../../utils/hooks/useSetting';

export default function RemoteDebuggingSettings() {
  const [allowRemoteDebugging, setAllowRemoteDebugging] = useSetting<boolean>('cef_forward', false);

  return (
    <Field
      label="Allow Remote CEF Debugging"
      description={
        <span style={{ whiteSpace: 'pre-line' }}>
          Allows unauthenticated access to the CEF debugger to anyone in your network.
        </span>
      }
      icon={<FaChrome style={{ display: 'block' }} />}
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
