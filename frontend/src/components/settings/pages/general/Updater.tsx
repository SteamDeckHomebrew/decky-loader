import { Carousel, DialogButton, Field, Focusable, ProgressBarWithInfo, Spinner, showModal } from 'decky-frontend-lib';
import { useCallback } from 'react';
import { Suspense, lazy } from 'react';
import { useEffect, useState } from 'react';
import { FaArrowDown } from 'react-icons/fa';

import { VerInfo, callUpdaterMethod, finishUpdate } from '../../../../updater';
import { useDeckyState } from '../../../DeckyState';
import InlinePatchNotes from '../../../patchnotes/InlinePatchNotes';

const MarkdownRenderer = lazy(() => import('../../../Markdown'));

// import ReactMarkdown from 'react-markdown'
// import remarkGfm from 'remark-gfm'

function PatchNotesModal({ versionInfo, closeModal }: { versionInfo: VerInfo | null; closeModal?: () => {} }) {
  return (
    <Focusable onCancelButton={closeModal}>
      <Carousel
        fnItemRenderer={(id: number) => (
          <Focusable
            onActivate={() => {}}
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
              <h1>{versionInfo?.all?.[id]?.name}</h1>
              {versionInfo?.all?.[id]?.body ? (
                <Suspense fallback={<Spinner style={{ width: '24', height: '24' }} />}>
                  <MarkdownRenderer>{versionInfo.all[id].body}</MarkdownRenderer>
                </Suspense>
              ) : (
                'no patch notes for this version'
              )}
            </div>
          </Focusable>
        )}
        fnGetId={(id) => id}
        nNumItems={versionInfo?.all?.length}
        nHeight={window.innerHeight - 150}
        nItemHeight={window.innerHeight - 200}
        nItemMarginX={0}
        initialColumn={0}
        autoFocus={true}
        fnGetColumnWidth={() => window.innerWidth}
      />
    </Focusable>
  );
}

export default function UpdaterSettings() {
  const { isLoaderUpdating, setIsLoaderUpdating } = useDeckyState();
  const { versionInfo: versionInfo, setVersionInfo } = useDeckyState();

  // const [versionInfo, setVersionInfo] = useState<VerInfo | null>(null);
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
      {versionInfo?.remote && (
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
