import { ConfirmModal, Navigation, ProgressBarWithInfo, QuickAccessTab } from 'decky-frontend-lib';
import { FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaSpinner } from 'react-icons/fa';

import { InstallType } from '../../plugin';

interface MultiplePluginsInstallModalProps {
  requests: { name: string; version: string; hash: string; install_type: InstallType }[];
  onOK(): void | Promise<void>;
  onCancel(): void | Promise<void>;
  closeModal?(): void;
}

// values are the JSON keys used in the translation file
const InstallTypeTranslationMapping = {
  [InstallType.INSTALL]: 'install',
  [InstallType.REINSTALL]: 'reinstall',
  [InstallType.UPDATE]: 'update',
} as const satisfies Record<InstallType, string>;

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
  const [pluginInProgress, setPluginInProgress] = useState<string | null>();
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

  function finishDownload(name: string) {
    setPluginsCompleted([...pluginsCompleted, name]);
  }

  useEffect(() => {
    DeckyBackend.addEventListener('loader/plugin_download_info', updateDownloadState);
    DeckyBackend.addEventListener('loader/plugin_download_finish', finishDownload);

    return () => {
      DeckyBackend.removeEventListener('loader/plugin_download_info', updateDownloadState);
      DeckyBackend.removeEventListener('loader/plugin_download_finish', finishDownload);
    };
  }, []);

  // used as part of the title translation
  // if we know all operations are of a specific type, we can show so in the title to make decision easier
  const installTypeGrouped = useMemo((): TitleTranslationMapping => {
    if (requests.every(({ install_type }) => install_type === InstallType.INSTALL)) return 'install';
    if (requests.every(({ install_type }) => install_type === InstallType.REINSTALL)) return 'reinstall';
    if (requests.every(({ install_type }) => install_type === InstallType.UPDATE)) return 'update';
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
      strTitle={<div>{t(`MultiplePluginsInstallModal.title.${installTypeGrouped}`, { count: requests.length })}</div>}
      strOKButtonText={t(`MultiplePluginsInstallModal.ok_button.${loading ? 'loading' : 'idle'}`)}
    >
      <div>
        {t('MultiplePluginsInstallModal.confirm')}
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {requests.map(({ name, version, install_type, hash }, i) => {
            const installTypeStr = InstallTypeTranslationMapping[install_type];
            const description = t(`MultiplePluginsInstallModal.description.${installTypeStr}`, {
              name,
              version,
            });

            return (
              <li key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                <div>{description}</div>
                {(pluginsCompleted.includes(name) && <FaCheck />) || (name === pluginInProgress && <FaSpinner />)}
                {hash === 'False' && (
                  <div style={{ color: 'red', paddingLeft: '10px' }}>{t('PluginInstallModal.no_hash')}</div>
                )}
              </li>
            );
          })}
        </ul>
        <ProgressBarWithInfo
          layout="inline"
          bottomSeparator="none"
          nProgress={percentage}
          sOperationText={downloadInfo}
        />
      </div>
    </ConfirmModal>
  );
};

export default MultiplePluginsInstallModal;
