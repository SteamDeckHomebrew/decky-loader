import { Field, Toggle } from 'decky-frontend-lib';
import { useEffect, useState } from 'react';
import { FaBug } from 'react-icons/fa';

export default function RemoteDebuggingSettings() {
  const [allowRemoteDebugging, setAllowRemoteDebugging] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      const res = (await window.DeckyPluginLoader.callServerMethod('remote_debugging_allowed')) as { result: boolean };
      setAllowRemoteDebugging(res.result);
    })();
  }, []);

  return (
    <Field
      label="Allow Remote CEF Debugging"
      description={
        <span style={{ whiteSpace: 'pre-line' }}>
          Allow unauthenticated access to the CEF debugger to anyone in your network
        </span>
      }
      icon={<FaBug style={{ display: 'block' }} />}
    >
      <Toggle
        value={allowRemoteDebugging}
        onChange={(toggleValue) => {
          setAllowRemoteDebugging(toggleValue);
          if (toggleValue) window.DeckyPluginLoader.callServerMethod('allow_remote_debugging');
          else window.DeckyPluginLoader.callServerMethod('disallow_remote_debugging');
        }}
      />
    </Field>
  );
}
