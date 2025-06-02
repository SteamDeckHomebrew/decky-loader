import {
  Carousel,
  DialogButton,
  Field,
  Focusable,
  ProgressBarWithInfo,
  Spinner,
  findClassByName,
  findSP,
  showModal,
} from '@decky/ui';
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaExclamation } from 'react-icons/fa';

import { VerInfo, checkForUpdates, doUpdate } from '../../../../updater';
import { useDeckyState } from '../../../DeckyState';
import InlinePatchNotes from '../../../patchnotes/InlinePatchNotes';
import WithSuspense from '../../../WithSuspense';

const MarkdownRenderer = lazy(() => import('../../../Markdown'));

function PatchNotesModal({ versionInfo, closeModal }: { versionInfo: VerInfo | null; closeModal?: () => {} }) {
  const SP = findSP();
  const { t } = useTranslation();

  return (
    <>
      <style>
        {`
.steam-focus {
outline-offset: 2px;
outline: 2px solid rgba(255, 255, 255, 0.6);
animation: pulseOutline 1.2s infinite ease-in-out;
}

@keyframes pulseOutline {
  0% {
    outline: 2px solid rgba(255, 255, 255, 0.6);
  }
  50% {
    outline: 2px solid rgba(255, 255, 255, 1);
  }
  100% {
    outline: 2px solid rgba(255, 255, 255, 0.6);
  }
}
`}
      </style>

      <Focusable onCancelButton={closeModal}>
        <Carousel
          fnItemRenderer={(id: number) => (
            <Focusable
              style={{
                marginTop: '40px',
                height: 'calc( 100% - 40px )',
                overflowY: 'scroll',
                display: 'flex',
                justifyContent: 'center',
                margin: '30px',
                padding: '0 15px',
                backgroundColor: 'rgba(37, 40, 46, 0.5)',
              }}
            >
              <div>
                <h1>{versionInfo?.all?.[id]?.name || 'Invalid Update Name'}</h1>
                {versionInfo?.all?.[id]?.body ? (
                  <WithSuspense>
                    <MarkdownRenderer onDismiss={closeModal}>{versionInfo.all[id].body}</MarkdownRenderer>
                  </WithSuspense>
                ) : (
                  t('Updater.no_patch_notes_desc')
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
          fnGetColumnWidth={() => SP.innerWidth - SP.innerWidth * (10 / 100)}
          name={t('Updater.decky_updates') as string}
        />
      </Focusable>
    </>
  );
}

export default function UpdaterSettings() {
  const { isLoaderUpdating, versionInfo, setVersionInfo } = useDeckyState();

  const [checkingForUpdates, setCheckingForUpdates] = useState<boolean>(false);
  const [updateProgress, setUpdateProgress] = useState<number>(-1);
  const [reloading, setReloading] = useState<boolean>(false);

  const { t } = useTranslation();

  useEffect(() => {
    const a = DeckyBackend.addEventListener('updater/update_download_percentage', (percentage) => {
      setUpdateProgress(percentage);
    });

    const b = DeckyBackend.addEventListener('updater/finish_download', () => {
      setUpdateProgress(0);
      setReloading(true);
    });

    return () => {
      DeckyBackend.removeEventListener('updater/update_download_percentage', a);
      DeckyBackend.removeEventListener('updater/finish_download', b);
    };
  }, []);

  const showPatchNotes = useCallback(() => {
    showModal(<PatchNotesModal versionInfo={versionInfo} />);
  }, [versionInfo]);

  return (
    <>
      <Field
        onOptionsActionDescription={versionInfo?.all ? t('Updater.patch_notes_desc') : undefined}
        onOptionsButton={versionInfo?.all ? showPatchNotes : undefined}
        label={t('Updater.updates.label')}
        description={
          checkingForUpdates || versionInfo?.remote?.tag_name != versionInfo?.current || !versionInfo?.remote ? (
            ''
          ) : (
            <span>{t('Updater.updates.lat_version', { ver: versionInfo?.current })} </span>
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
                    const verInfo = await checkForUpdates();
                    setVersionInfo(verInfo);
                    setCheckingForUpdates(false);
                  }
                : async () => {
                    setUpdateProgress(0);
                    doUpdate();
                  }
            }
          >
            {checkingForUpdates
              ? t('Updater.updates.checking')
              : !versionInfo?.remote || versionInfo?.remote?.tag_name == versionInfo?.current
                ? t('Updater.updates.check_button')
                : t('Updater.updates.install_button')}
          </DialogButton>
        ) : (
          <ProgressBarWithInfo
            layout="inline"
            bottomSeparator="none"
            nProgress={updateProgress}
            indeterminate={reloading}
            sOperationText={reloading ? t('Updater.updates.reloading') : t('Updater.updates.updating')}
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
