import { ConfirmModal, Navigation, ProgressBarWithInfo, QuickAccessTab } from '@decky/ui';
import { FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaDownload } from 'react-icons/fa';

import { InstallType, InstallTypeTranslationMapping } from '../../plugin';

interface MultiplePluginsInstallModalProps {
  requests: { name: string; version: string; hash: string; install_type: InstallType }[];
  onOK(): void | Promise<void>;
  onCancel(): void | Promise<void>;
  closeModal?(): void;
}

// IMPORTANT! Keep in sync with `t(...)` comments below
type TitleTranslationMapping = 'mixed' | (typeof InstallTypeTranslationMapping)[InstallType];

const MultiplePluginsInstallModal: FC<MultiplePluginsInstallModalProps> = ({
  requests,
  onOK,
  onCancel,
  closeModal,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [percentage, setPercentage] = useState<number>(0);
  const [pluginsCompleted, setPluginsCompleted] = useState<string[]>([]);
  const [pluginInProgress, setInProgress] = useState<string | null>();
  const [downloadInfo, setDownloadInfo] = useState<string | null>(null);
  const { t } = useTranslation();

  function updateDownloadState(percent: number, trans_text: string | undefined, trans_info: Record<string, string>) {
    setPercentage(percent);
    if (trans_text === undefined) {
      setDownloadInfo(null);
    } else {
      setDownloadInfo(t(trans_text, trans_info));
    }
  }

  function startDownload(name: string) {
    setInProgress(name);
    setPercentage(0);
  }

  function finishDownload(name: string) {
    setPluginsCompleted((list) => [...list, name]);
  }

  useEffect(() => {
    DeckyBackend.addEventListener('loader/plugin_download_info', updateDownloadState);
    DeckyBackend.addEventListener('loader/plugin_download_start', startDownload);
    DeckyBackend.addEventListener('loader/plugin_download_finish', finishDownload);

    return () => {
      DeckyBackend.removeEventListener('loader/plugin_download_info', updateDownloadState);
      DeckyBackend.removeEventListener('loader/plugin_download_start', startDownload);
      DeckyBackend.removeEventListener('loader/plugin_download_finish', finishDownload);
    };
  }, []);

  // used as part of the title translation
  // if we know all operations are of a specific type, we can show so in the title to make decision easier
  const installTypeGrouped = useMemo((): TitleTranslationMapping => {
    if (requests.every(({ install_type }) => install_type === InstallType.INSTALL)) return 'install';
    if (requests.every(({ install_type }) => install_type === InstallType.REINSTALL)) return 'reinstall';
    if (requests.every(({ install_type }) => install_type === InstallType.UPDATE)) return 'update';
    if (requests.every(({ install_type }) => install_type === InstallType.DOWNGRADE)) return 'downgrade';
    if (requests.every(({ install_type }) => install_type === InstallType.OVERWRITE)) return 'overwrite';
    return 'mixed';
  }, [requests]);

  return (
    <ConfirmModal
      bOKDisabled={loading}
      closeModal={closeModal}
      onOK={async () => {
        setLoading(true);
        await onOK();
        setTimeout(() => Navigation.OpenQuickAccessMenu(QuickAccessTab.Decky), 250);
        setTimeout(() => DeckyPluginLoader.checkPluginUpdates(), 1000);
      }}
      onCancel={async () => {
        await onCancel();
      }}
      strTitle={
        <div>
          {
            // IMPORTANT! These comments are not cosmetic and are needed for `extracttext` task to work
            // t('MultiplePluginsInstallModal.title.install', { count: n })
            // t('MultiplePluginsInstallModal.title.reinstall', { count: n })
            // t('MultiplePluginsInstallModal.title.update', { count: n })
            // t('MultiplePluginsInstallModal.title.downgrade', { count: n })
            // t('MultiplePluginsInstallModal.title.overwrite', { count: n })
            // t('MultiplePluginsInstallModal.title.mixed', { count: n })
            t(`MultiplePluginsInstallModal.title.${installTypeGrouped}`, { count: requests.length })
          }
        </div>
      }
      strOKButtonText={
        loading ? t('MultiplePluginsInstallModal.ok_button.loading') : t('MultiplePluginsInstallModal.ok_button.idle')
      }
    >
      <div>
        {t('MultiplePluginsInstallModal.confirm')}
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {requests.map(({ name, version, install_type, hash }, i) => {
            const installTypeStr = InstallTypeTranslationMapping[install_type];
            // IMPORTANT! These comments are not cosmetic and are needed for `extracttext` task to work
            // t('MultiplePluginsInstallModal.description.install')
            // t('MultiplePluginsInstallModal.description.reinstall')
            // t('MultiplePluginsInstallModal.description.update')
            // t('MultiplePluginsInstallModal.description.downgrade')
            // t('MultiplePluginsInstallModal.description.overwrite')
            const description = t(`MultiplePluginsInstallModal.description.${installTypeStr}`, {
              name,
              version,
            });

            return (
              <li key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                <span>
                  {description}{' '}
                  {(pluginsCompleted.includes(name) && <FaCheck />) || (name === pluginInProgress && <FaDownload />)}
                </span>
                {hash === 'False' && (
                  <div style={{ color: 'red', paddingLeft: '10px' }}>{t('PluginInstallModal.no_hash')}</div>
                )}
              </li>
            );
          })}
        </ul>
        {/* TODO: center the progress bar and make it 80% width */}
        {loading && (
          <ProgressBarWithInfo
            // when the key changes, react considers this a new component so resets the progress without the smoothing animation
            key={pluginInProgress}
            bottomSeparator="none"
            focusable={false}
            nProgress={percentage}
            sOperationText={downloadInfo}
          />
        )}
      </div>
    </ConfirmModal>
  );
};

export default MultiplePluginsInstallModal;
