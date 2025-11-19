import { joinClassNames, sleep } from '@decky/ui';
import { FunctionComponent, useEffect, useReducer, useState } from 'react';

import { uninstallPlugin } from '../plugin';
import { VerInfo, doRestart, doShutdown } from '../updater';
import { ValveReactErrorInfo, getLikelyErrorSourceFromValveReactError } from '../utils/errors';
import { useSetting } from '../utils/hooks/useSetting';
import { UpdateBranch } from './settings/pages/general/BranchSelect';

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

const classes = {
  root: 'deckyErrorBoundary',
  likelyOccurred: 'likely-occured-msg',
  panel: 'panel-section',
  panelHeader: 'panel-header',
  trace: 'trace',
  rowList: 'row-list',
  rowItem: 'row-item',
  buttonDescRow: 'button-description-row',
  grayText: 'gray-text',
  flexRowWGap: 'flex-row',
  marginBottom: 'margin-bottom',
};

const vars = {
  scrollBarwidth: '18px',
  rootMarginLeft: '15px',
  panelXPadding: '20px',
};

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

  const [selectedBranch, setSelectedBranch] = useSetting<UpdateBranch>('branch', UpdateBranch.Stable);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [updateProgress, setUpdateProgress] = useState<number>(-1);
  const [versionToUpdateTo, setSetVersionToUpdateTo] = useState<string>('');

  useEffect(() => {
    const a = DeckyBackend.addEventListener('updater/update_download_percentage', (percentage) => {
      setUpdateProgress(percentage);
    });

    const b = DeckyBackend.addEventListener('updater/finish_download', () => {
      setUpdateProgress(-2);
    });

    return () => {
      DeckyBackend.removeEventListener('updater/update_download_percentage', a);
      DeckyBackend.removeEventListener('updater/finish_download', b);
    };
  }, []);

  return (
    <>
      <style>
        {`
          *:has(> .${classes.root}) {
            margin-top: var(--basicui-header-height);
            overflow: scroll !important;
            background: radial-gradient(circle at 79% 96%, rgba(92, 21, 157, 0.23), rgba(92, 21, 157, 0) 69%), radial-gradient(circle at 14% 90%, rgba(0, 146, 219, 0.17), rgba(0, 146, 219, 0) 51%), radial-gradient(circle at 93% 11%, rgb(138 0 62 / 9%), rgba(204, 0, 92, 0) 50%), linear-gradient(to bottom right, rgba(5, 15, 31, 1), rgba(5, 15, 31, 1));
          }
          *:has(> .${classes.root})::-webkit-scrollbar {
            display: initial !important;
            width: ${vars.scrollBarwidth};
            height: 0px;
          }
          *:has(> .${classes.root})::-webkit-scrollbar-thumb {
            background: #4349535e;
          }
          .${classes.root} {
            color: #93929e;
            font-size: 15px;
            margin: 10px 0px 40px ${vars.rootMarginLeft};
            width: calc(100vw - ${vars.scrollBarwidth} - ${vars.rootMarginLeft});
            overflow: visible;
          }
          .${classes.root} button,
          .${classes.root} select {
            border: none;
            padding: 4px 16px !important;
            background: #0d263f;
            color: #2294f4;
            font-size: 12px;
            border-radius: 3px;
            box-shadow: 8px 9px 8px -5px rgb(4 7 31), inset 0px 14px 11px -10px rgb(38 56 74);
            outline: none;
            height: 28px;
          }
          .${classes.panel} {
            background: #03081270;
            padding: 8px ${vars.panelXPadding};
            border-radius: 3px;
            /* box-shadow: 9px 9px 20px -5px rgb(0 0 0 / 89%); */
          }
          .${classes.panelHeader} {
            font-size: 18px;
            font-weight: bolder;
            text-transform: uppercase;
          }
          .${classes.likelyOccurred} {
            font-size: 22px;
            font-weight: 500;
            color: #588fb4;
          }
          .${classes.rowItem} {
            position: relative;
          }
          .${classes.rowItem}:not(:last-child)::after {
            content: '';
            position: absolute;
            bottom: -4.5px;
            left: 5px;
            right: 15px;
            height: 0.5px;
            background: #3c3c3c47;
          }
          .${classes.flexRowWGap},
          .${classes.buttonDescRow},
          .${classes.rowList},
          .${classes.panel} {
            display: flex;
          }

          .${classes.rowList},
          .${classes.panel} {
            flex-direction: column;
          }
          .${classes.flexRowWGap},
          .${classes.rowList} {
            gap: 8px;
          }
          .${classes.grayText} {
            color: #74778096;
          }
          .${classes.marginBottom} {
            margin-bottom: 10px;
          }
          .${classes.buttonDescRow} {
            justify-content: space-between;
            align-items: center;
          }
        `}
      </style>
      <div className={classes.root}>
        <div className={classes.marginBottom} style={{ fontSize: '20px' }}>
          ⚠️ An error occured while rendering this content.
        </div>
        <pre className={joinClassNames(classes.grayText, classes.marginBottom)} style={{ marginTop: '0px' }}>
          <code>
            {identifier && `Error Reference: ${identifier}`}
            {versionInfo?.current && `\nDecky Version: ${versionInfo.current}`}
          </code>
        </pre>
        <div className={joinClassNames(classes.likelyOccurred, classes.marginBottom)}>
          This error likely occured in {errorSource}.
        </div>
        {actionLog?.length > 0 && (
          <pre className={classes.grayText}>
            <code>
              Running actions...
              {actionLog}
            </code>
          </pre>
        )}
        {actionsEnabled && (
          <div className={classes.panel}>
            <div className={classes.flexRowWGap} style={{ alignItems: 'baseline' }}>
              <div className={classes.panelHeader}>Actions</div>
              <div className={classes.grayText} style={{ fontSize: 'small', fontStyle: 'italic' }}>
                Use the touch screen.
              </div>
            </div>
            <div className={classes.rowList}>
              <div className={joinClassNames(classes.rowItem, classes.flexRowWGap)} style={{ justifyContent: 'right' }}>
                <button onClick={reset}>Retry</button>
                <button
                  onClick={() => {
                    addLogLine('Restarting Steam...');
                    SteamClient.User.StartRestart(false);
                  }}
                >
                  Restart Steam
                </button>
                <button
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
              </div>
              {wasCausedByPlugin && (
                <div className={joinClassNames(classes.rowItem, classes.buttonDescRow)}>
                  Disable/ uninstall suspected plugin and restart Decky
                  <div className={classes.flexRowWGap}>
                    {/**temp placeholder for plugin disable functionality*/}
                    {/* <button>
                      Disable {errorSource}
                    </button> */}
                    <button
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
                        SteamClient.User.StartRestart(false);
                      }}
                    >
                      Uninstall {errorSource}
                    </button>
                  </div>
                </div>
              )}
              {/**temp placeholder for plugin disable functionality*/}
              {/* <div className={joinClassNames(classes.rowItem, classes.buttonDescRow)}>
                Disable all plugins and restart Decky
                <button>
                  Disable All Plugins
                </button>
              </div> */}
              <div className={joinClassNames(classes.rowItem, classes.buttonDescRow)}>
                Disable Decky until next boot
                <button
                  onClick={async () => {
                    setActionsEnabled(false);
                    addLogLine('Stopping Decky...');
                    doShutdown();
                    await sleep(5000);
                    addLogLine('Restarting Steam...');
                    SteamClient.User.StartRestart(false);
                  }}
                >
                  Disable Decky
                </button>
              </div>
              {
                <div className={joinClassNames(classes.rowItem, classes.buttonDescRow)}>
                  {updateProgress > -1
                    ? 'Update in progress... ' + updateProgress + '%'
                    : updateProgress == -2
                      ? 'Update complete. Restarting...'
                      : 'Check for Decky updates'}
                  {
                    <div className={classes.flexRowWGap}>
                      {updateProgress == -1 && (
                        <>
                          <select
                            onChange={async (e) => {
                              const branch = parseInt(e.target.value);
                              setSelectedBranch(branch);
                              setSetVersionToUpdateTo('');
                            }}
                          >
                            <option value="0" selected={selectedBranch == UpdateBranch.Stable}>
                              Stable
                            </option>
                            <option value="1" selected={selectedBranch == UpdateBranch.Prerelease}>
                              Pre-Release
                            </option>
                            <option value="2" selected={selectedBranch == UpdateBranch.Testing}>
                              Testing
                            </option>
                          </select>
                          <button
                            disabled={updateProgress != -1 || isChecking}
                            onClick={async () => {
                              if (versionToUpdateTo == '') {
                                setIsChecking(true);
                                const versionInfo = (await DeckyBackend.callable(
                                  'updater/check_for_updates',
                                )()) as unknown as VerInfo;
                                setIsChecking(false);
                                if (versionInfo?.remote && versionInfo?.remote?.tag_name != versionInfo?.current) {
                                  setSetVersionToUpdateTo(versionInfo.remote.tag_name);
                                } else {
                                  setSetVersionToUpdateTo('');
                                }
                              } else {
                                DeckyBackend.callable('updater/do_update')();
                                setUpdateProgress(0);
                              }
                            }}
                          >
                            {' '}
                            {isChecking
                              ? 'Checking for updates...'
                              : versionToUpdateTo != ''
                                ? 'Update to ' + versionToUpdateTo
                                : 'Check for updates'}
                          </button>
                        </>
                      )}
                    </div>
                  }
                </div>
              }
              {debugAllowed && (
                <div className={joinClassNames(classes.rowItem, classes.buttonDescRow)}>
                  Enable remote debugging and SSH until next boot
                  <button
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
                    Enable
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {actionsEnabled && (
          <div
            className={classes.grayText}
            style={{
              fontStyle: 'italic',
              fontSize: 'small',
              textAlign: 'center',
              textShadow: '2px 2px 4px rgb(0 0 0 / 60%)',
            }}
          >
            Swipe to scroll
          </div>
        )}
        <div className={classes.panel}>
          <div className={classes.panelHeader}>Trace</div>
          <pre
            style={{
              margin: `8px calc(-1 * ${vars.panelXPadding})`,
              userSelect: 'auto',
              overflowX: 'scroll',
              padding: `0px ${vars.panelXPadding}`,
              maskImage: `linear-gradient(to right, transparent, black ${vars.panelXPadding}, black calc(100% - ${vars.panelXPadding}), transparent)`,
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
      </div>
    </>
  );
};

export default DeckyErrorBoundary;
