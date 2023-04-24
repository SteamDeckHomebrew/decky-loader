import {
  Carousel,
  DialogButton,
  Field,
  FocusRing,
  Focusable,
  ProgressBarWithInfo,
  Spinner,
  findSP,
  showModal,
} from 'decky-frontend-lib';
import { useCallback } from 'react';
import { Suspense, lazy } from 'react';
import { useEffect, useState } from 'react';
import { FaExclamation } from 'react-icons/fa';

import { VerInfo, callUpdaterMethod, finishUpdate } from '../../../../updater';
import { useDeckyState } from '../../../DeckyState';
import InlinePatchNotes from '../../../patchnotes/InlinePatchNotes';
import WithSuspense from '../../../WithSuspense';

const MarkdownRenderer = lazy(() => import('../../../Markdown'));

function PatchNotesModal({ versionInfo, closeModal }: { versionInfo: VerInfo | null; closeModal?: () => {} }) {
  const SP = findSP();
  return (
    <Focusable onCancelButton={closeModal}>
      <FocusRing>
        <Carousel
          fnItemRenderer={(id: number) => (
            <Focusable
              style={{
                marginTop: '40px',
                height: 'calc( 100% - 40px )',
                overflowY: 'scroll',
                display: 'flex',
                justifyContent: 'center',
                margin: '40px',
              }}
            >
              <div>
                <h1>{versionInfo?.all?.[id]?.name || 'Invalid Update Name'}</h1>
                {versionInfo?.all?.[id]?.body ? (
                  <WithSuspense>
                    <MarkdownRenderer onDismiss={closeModal}>{versionInfo.all[id].body}</MarkdownRenderer>
                  </WithSuspense>
                ) : (
                  'no patch notes for this version'
                )}
              </div>
            </Focusable>
          )}
          fnGetId={(id) => id}
          nNumItems={versionInfo?.all?.length}
          nHeight={SP.innerHeight - 40}
          nItemHeight={SP.innerHeight - 40}
          nItemMarginX={0}
          initialColumn={0}
          autoFocus={true}
          fnGetColumnWidth={() => SP.innerWidth}
          name="Decky Updates"
        />
      </FocusRing>
    </Focusable>
  );
}

export default function UpdaterSettings() {
  const { isLoaderUpdating, setIsLoaderUpdating, versionInfo, setVersionInfo } = useDeckyState();

  const [checkingForUpdates, setCheckingForUpdates] = useState<boolean>(false);
  const [updateProgress, setUpdateProgress] = useState<number>(-1);
  const [reloading, setReloading] = useState<boolean>(false);

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

  const showPatchNotes = useCallback(() => {
    showModal(<PatchNotesModal versionInfo={versionInfo} />);
  }, [versionInfo]);

  return (
    <>
      <Field
        onOptionsActionDescription={versionInfo?.all ? 'Patch Notes' : undefined}
        onOptionsButton={versionInfo?.all ? showPatchNotes : undefined}
        label="Decky Updates"
        description={
          checkingForUpdates || versionInfo?.remote?.tag_name != versionInfo?.current || !versionInfo?.remote ? (
            ''
          ) : (
            <span>Up to date: running {versionInfo?.current}</span>
          )
        }
        icon={
          versionInfo?.remote &&
          versionInfo?.remote?.tag_name != versionInfo?.current && (
            <FaExclamation color="var(--gpColor-Yellow)" style={{ display: 'block' }} />
          )
        }
        childrenContainerWidth={'fixed'}
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
            bottomSeparator="none"
            nProgress={updateProgress}
            indeterminate={reloading}
            sOperationText={reloading ? 'Reloading' : 'Updating'}
          />
        )}
      </Field>
      {versionInfo?.remote && versionInfo?.remote?.tag_name != versionInfo?.current && (
        <InlinePatchNotes
          title={versionInfo?.remote.name}
          date={new Intl.RelativeTimeFormat('en-US', {
            numeric: 'auto',
          }).format(
            Math.ceil((new Date(versionInfo.remote.published_at).getTime() - new Date().getTime()) / 86400000),
            'day',
          )}
          onClick={showPatchNotes}
        >
          <Suspense fallback={<Spinner style={{ width: '24', height: '24' }} />}>
            <MarkdownRenderer>{versionInfo?.remote.body}</MarkdownRenderer>
          </Suspense>
        </InlinePatchNotes>
      )}
    </>
  );
}
