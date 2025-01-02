import { ConfirmModal, Navigation, ProgressBarWithInfo, QuickAccessTab } from '@decky/ui';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InstallType, InstallTypeTranslationMapping } from '../../plugin';

interface PluginInstallModalProps {
  artifact: string;
  version: string;
  hash: string;
  installType: InstallType;
  onOK(): void;
  onCancel(): void;
  closeModal?(): void;
}

const PluginInstallModal: FC<PluginInstallModalProps> = ({
  artifact,
  version,
  hash,
  installType,
  onOK,
  onCancel,
  closeModal,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [percentage, setPercentage] = useState<number>(0);
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

  useEffect(() => {
    DeckyBackend.addEventListener('loader/plugin_download_info', updateDownloadState);
    return () => {
      DeckyBackend.removeEventListener('loader/plugin_download_info', updateDownloadState);
    };
  }, []);

  const installTypeTranslationKey = InstallTypeTranslationMapping[installType];

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
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
          {
            // IMPORTANT! These comments are not cosmetic and are needed for `extracttext` task to work
            // t('PluginInstallModal.install.title')
            // t('PluginInstallModal.reinstall.title')
            // t('PluginInstallModal.update.title')
            // t('PluginInstallModal.downgrade.title')
            // t('PluginInstallModal.overwrite.title')
            t(`PluginInstallModal.${installTypeTranslationKey}.title`, { artifact: artifact })
          }
          {loading && (
            <div style={{ marginLeft: 'auto' }}>
              <ProgressBarWithInfo
                layout="inline"
                bottomSeparator="none"
                nProgress={percentage}
                sOperationText={downloadInfo}
              />
            </div>
          )}
        </div>
      }
      strOKButtonText={
        loading ? (
          <div>
            {
              // IMPORTANT! These comments are not cosmetic and are needed for `extracttext` task to work
              // t('PluginInstallModal.install.button_processing')
              // t('PluginInstallModal.reinstall.button_processing')
              // t('PluginInstallModal.update.button_processing')
              // t('PluginInstallModal.downgrade.button_processing')
              // t('PluginInstallModal.overwrite.button_processing')
              t(`PluginInstallModal.${installTypeTranslationKey}.button_processing`)
            }
          </div>
        ) : (
          <div>
            {
              // IMPORTANT! These comments are not cosmetic and are needed for `extracttext` task to work
              // t('PluginInstallModal.install.button_idle')
              // t('PluginInstallModal.reinstall.button_idle')
              // t('PluginInstallModal.update.button_idle')
              // t('PluginInstallModal.downgrade.button_idle')
              // t('PluginInstallModal.overwrite.button_idle')
              t(`PluginInstallModal.${installTypeTranslationKey}.button_idle`)
            }
          </div>
        )
      }
    >
      <div>
        {
          // IMPORTANT! These comments are not cosmetic and are needed for `extracttext` task to work
          // t('PluginInstallModal.install.desc')
          // t('PluginInstallModal.reinstall.desc')
          // t('PluginInstallModal.update.desc')
          // t('PluginInstallModal.downgrade.desc')
          // t('PluginInstallModal.overwrite.desc')
          t(`PluginInstallModal.${installTypeTranslationKey}.desc`, {
            artifact: artifact,
            version: version,
          })
        }
      </div>
      {hash == 'False' && <span style={{ color: 'red' }}>{t('PluginInstallModal.no_hash')}</span>}
    </ConfirmModal>
  );
};

export default PluginInstallModal;
