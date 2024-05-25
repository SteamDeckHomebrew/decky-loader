import { ConfirmModal, Navigation, ProgressBarWithInfo, QuickAccessTab } from '@decky/ui';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import TranslationHelper, { TranslationClass } from '../../utils/TranslationHelper';

interface PluginInstallModalProps {
  artifact: string;
  version: string;
  hash: string;
  installType: number;
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
          <TranslationHelper
            transClass={TranslationClass.PLUGIN_INSTALL_MODAL}
            transText="title"
            i18nArgs={{ artifact: artifact }}
            installType={installType}
          />
        </div>
      }
      strOKButtonText={
        loading ? (
          <div>
            <TranslationHelper
              transClass={TranslationClass.PLUGIN_INSTALL_MODAL}
              transText="button_processing"
              installType={installType}
            />
          </div>
        ) : (
          <div>
            <TranslationHelper
              transClass={TranslationClass.PLUGIN_INSTALL_MODAL}
              transText="button_idle"
              installType={installType}
            />
          </div>
        )
      }
    >
      <div>
        <TranslationHelper
          transClass={TranslationClass.PLUGIN_INSTALL_MODAL}
          transText="desc"
          i18nArgs={{
            artifact: artifact,
            version: version,
          }}
          installType={installType}
        />
      </div>
      {loading && (
        <ProgressBarWithInfo
          layout="inline"
          bottomSeparator="none"
          nProgress={percentage}
          sOperationText={downloadInfo}
        />
      )}
      {hash == 'False' && <span style={{ color: 'red' }}>{t('PluginInstallModal.no_hash')}</span>}
    </ConfirmModal>
  );
};

export default PluginInstallModal;
