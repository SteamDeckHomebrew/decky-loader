import { DialogButton, Field, ProgressBarWithInfo, Spinner } from 'decky-frontend-lib';
import { useEffect, useState } from 'react';
import { FaArrowDown } from 'react-icons/fa';

import { VerInfo, callUpdaterMethod, finishUpdate } from '../../../../updater';
import { useDeckyState } from '../../../DeckyState';

export default function UpdaterSettings() {
  const [versionInfo, setVersionInfo] = useState<VerInfo | null>(null);
  const [checkingForUpdates, setCheckingForUpdates] = useState<boolean>(false);
  const { isLoaderUpdating, setIsLoaderUpdating } = useDeckyState();
  const [updateProgress, setUpdateProgress] = useState<number>(-1);
  const [reloading, setReloading] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const res = (await callUpdaterMethod('get_version')) as { result: VerInfo };
      setVersionInfo(res.result);
    })();
  }, []);

  useEffect(() => {
    window.DeckyUpdater = {
      updateProgress: (i) => {
        setUpdateProgress(i);
        setIsLoaderUpdating(true);
      },
      finish: async () => {
        setUpdateProgress(0);
        setReloading(true);
        await finishUpdate();
      },
    };
  }, []);

  return (
    <Field
      label="Updates"
      description={
        versionInfo && (
          <span style={{ whiteSpace: 'pre-line' }}>{`Current version: ${versionInfo.current}\n${
            versionInfo.updatable ? `Latest version: ${versionInfo.remote?.tag_name}` : ''
          }`}</span>
        )
      }
      icon={
        !versionInfo ? (
          <Spinner style={{ width: '1em', height: 20, display: 'block' }} />
        ) : (
          <FaArrowDown style={{ display: 'block' }} />
        )
      }
    >
      {updateProgress == -1 && !isLoaderUpdating ? (
        <DialogButton
          disabled={!versionInfo?.updatable || checkingForUpdates}
          onClick={
            !versionInfo?.remote || versionInfo?.remote?.tag_name == versionInfo?.current
              ? async () => {
                  setCheckingForUpdates(true);
                  const res = (await callUpdaterMethod('check_for_updates')) as { result: VerInfo };
                  setVersionInfo(res.result);
                  setCheckingForUpdates(false);
                }
              : async () => {
                  setUpdateProgress(0);
                  callUpdaterMethod('do_update');
                }
          }
        >
          {checkingForUpdates
            ? 'Checking'
            : !versionInfo?.remote || versionInfo?.remote?.tag_name == versionInfo?.current
            ? 'Check For Updates'
            : 'Install Update'}
        </DialogButton>
      ) : (
        <ProgressBarWithInfo
          layout="inline"
          bottomSeparator={false}
          nProgress={updateProgress}
          indeterminate={reloading}
          sOperationText={reloading ? 'Reloading' : 'Updating'}
        />
      )}
    </Field>
  );
}
