import { ConfirmModal, Navigation, QuickAccessTab } from 'decky-frontend-lib';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PluginInstallModalProps {
  artifact: string;
  version: string;
  hash: string;
  reinstall: boolean;
  onOK(): void;
  onCancel(): void;
  closeModal?(): void;
}

const PluginInstallModal: FC<PluginInstallModalProps> = ({
  artifact,
  version,
  hash,
  reinstall,
  onOK,
  onCancel,
  closeModal,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const { t } = useTranslation();
  return (
    <ConfirmModal
      bOKDisabled={loading}
      closeModal={closeModal}
      onOK={async () => {
        setLoading(true);
        await onOK();
        setTimeout(() => Navigation.OpenQuickAccessMenu(QuickAccessTab.Decky), 250);
        setTimeout(() => window.DeckyPluginLoader.checkPluginUpdates(), 1000);
      }}
      onCancel={async () => {
        await onCancel();
      }}
      strTitle={t('PluginInstallModal.install.title_interval', {
        postProcess: 'interval',
        count: reinstall ? 1 : 0,
        artifact: artifact,
      })}
      strOKButtonText={
        loading
          ? t('PluginInstallModal.install.button_processing', { count: reinstall ? 1 : 0 })
          : t('PluginInstallModal.install.button_idle', { count: reinstall ? 1 : 0 })
      }
    >
      {hash == 'False' ? (
        <h3 style={{ color: 'red' }}>!!!!NO HASH PROVIDED!!!!</h3>
      ) : (
        t('PluginInstallModal.install.desc_interval', {
          postProcess: 'interval',
          count: reinstall ? 1 : 0,
          artifact: artifact,
          version: version,
        })
      )}
    </ConfirmModal>
  );
};

export default PluginInstallModal;
