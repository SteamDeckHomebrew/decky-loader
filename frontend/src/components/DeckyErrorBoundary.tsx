import { sleep } from '@decky/ui';
import { FunctionComponent, useEffect, useReducer, useState } from 'react';

import { uninstallPlugin } from '../plugin';
import { VerInfo, doRestart, doShutdown } from '../updater';
import { ValveReactErrorInfo, getLikelyErrorSourceFromValveReactError } from '../utils/errors';

interface DeckyErrorBoundaryProps {
  error: ValveReactErrorInfo;
  errorKey: string;
  identifier: string;
  reset: () => void;
}

declare global {
  interface Window {
    SystemNetworkStore?: any;
  }
}

export const startSSH = DeckyBackend.callable('utilities/start_ssh');
export const starrCEFForwarding = DeckyBackend.callable('utilities/allow_remote_debugging');

function ipToString(ip: number) {
  return [(ip >>> 24) & 255, (ip >>> 16) & 255, (ip >>> 8) & 255, (ip >>> 0) & 255].join('.');
}

// Intentionally not localized since we can't really trust React here
const DeckyErrorBoundary: FunctionComponent<DeckyErrorBoundaryProps> = ({ error, identifier, reset }) => {
  const [actionLog, addLogLine] = useReducer((log: string, line: string) => (log += '\n' + line), '');
  const [actionsEnabled, setActionsEnabled] = useState<boolean>(true);
  const [debugAllowed, setDebugAllowed] = useState<boolean>(true);
  // Intentionally doesn't use DeckyState.
  const [versionInfo, setVersionInfo] = useState<VerInfo>();
  const [errorSource, wasCausedByPlugin, shouldReportToValve] = getLikelyErrorSourceFromValveReactError(error);
  useEffect(() => {
    if (!shouldReportToValve) DeckyPluginLoader.errorBoundaryHook.temporarilyDisableReporting();
    DeckyPluginLoader.updateVersion().then(setVersionInfo);
  }, []);
  return (
    <>
      <style>
        {`
          *:has(> .deckyErrorBoundary) {
            overflow: scroll !important;
          }
        `}
      </style>
      <div
        style={{
          overflow: 'auto',
          marginLeft: '15px',
          color: 'white',
          fontSize: '16px',
          userSelect: 'auto',
          backgroundColor: 'black',
          marginTop: '48px', // Incase this is a page
        }}
        className="deckyErrorBoundary"
      >
        <h1
          style={{
            fontSize: '20px',
            display: 'inline-block',
            userSelect: 'auto',
          }}
        >
          ⚠️ An error occured while rendering this content.
        </h1>
        <pre style={{}}>
          <code>
            {identifier && `Error Reference: ${identifier}`}
            {versionInfo?.current && `\nDecky Version: ${versionInfo.current}`}
          </code>
        </pre>
        <p>This error likely occured in {errorSource}.</p>
        {actionLog?.length > 0 && (
          <pre>
            <code>
              Running actions...
              {actionLog}
            </code>
          </pre>
        )}
        {actionsEnabled && (
          <>
            <h3>Actions: </h3>
            <p>Use the touch screen.</p>
            <div style={{ display: 'block', marginBottom: '5px' }}>
              <button style={{ marginRight: '5px', padding: '5px' }} onClick={reset}>
                Retry
              </button>
              <button
                style={{ marginRight: '5px', padding: '5px' }}
                onClick={() => {
                  addLogLine('Restarting Steam...');
                  SteamClient.User.StartRestart();
                }}
              >
                Restart Steam
              </button>
            </div>
            <div style={{ display: 'block', marginBottom: '5px' }}>
              <button
                style={{ marginRight: '5px', padding: '5px' }}
                onClick={async () => {
                  setActionsEnabled(false);
                  addLogLine('Restarting Decky...');
                  doRestart();
                  await sleep(2000);
                  addLogLine('Reloading UI...');
                }}
              >
                Restart Decky
              </button>
              <button
                style={{ marginRight: '5px', padding: '5px' }}
                onClick={async () => {
                  setActionsEnabled(false);
                  addLogLine('Stopping Decky...');
                  doShutdown();
                  await sleep(5000);
                  addLogLine('Restarting Steam...');
                  SteamClient.User.StartRestart();
                }}
              >
                Disable Decky until next boot
              </button>
            </div>
            {debugAllowed && (
              <div style={{ display: 'block', marginBottom: '5px' }}>
                <button
                  style={{ marginRight: '5px', padding: '5px' }}
                  onClick={async () => {
                    setDebugAllowed(false);
                    addLogLine('Enabling CEF debugger forwarding...');
                    await starrCEFForwarding();
                    addLogLine('Enabling SSH...');
                    await startSSH();
                    addLogLine('Ready for debugging!');
                    if (window?.SystemNetworkStore?.wirelessNetworkDevice?.ip4?.addresses?.[0]?.ip) {
                      const ip = ipToString(window.SystemNetworkStore.wirelessNetworkDevice.ip4.addresses[0].ip);
                      addLogLine(`CEF Debugger: http://${ip}:8081`);
                      addLogLine(`SSH: deck@${ip}`);
                    }
                  }}
                >
                  Allow remote debugging and SSH until next boot
                </button>
              </div>
            )}
            {wasCausedByPlugin && (
              <div style={{ display: 'block', marginBottom: '5px' }}>
                {'\n'}
                <button
                  style={{ marginRight: '5px', padding: '5px' }}
                  onClick={async () => {
                    setActionsEnabled(false);
                    addLogLine(`Uninstalling ${errorSource}...`);
                    await uninstallPlugin(errorSource);
                    await DeckyPluginLoader.frozenPluginsService.invalidate();
                    await DeckyPluginLoader.hiddenPluginsService.invalidate();
                    await sleep(1000);
                    addLogLine('Restarting Decky...');
                    doRestart();
                    await sleep(2000);
                    addLogLine('Restarting Steam...');
                    await sleep(500);
                    SteamClient.User.StartRestart();
                  }}
                >
                  Uninstall {errorSource} and restart Decky
                </button>
              </div>
            )}
          </>
        )}

        <pre
          style={{
            marginTop: '15px',
            opacity: 0.7,
            userSelect: 'auto',
          }}
        >
          <code>
            {error.error.stack}
            {'\n\n'}
            Component Stack:
            {error.info.componentStack}
          </code>
        </pre>
      </div>
    </>
  );
};

export default DeckyErrorBoundary;
