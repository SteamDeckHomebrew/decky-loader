import { ConfirmModal, Navigation, QuickAccessTab } from 'decky-frontend-lib';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PluginInstallModalProps {
  artifact: string;
  version: string;
  hash: string;
  // reinstall: boolean;
  onOK(): void;
  onCancel(): void;
  closeModal?(): void;
}

const PluginInstallModal: FC<PluginInstallModalProps> = ({ artifact, version, hash, onOK, onCancel, closeModal }) => {
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
      strTitle={t('PluginInstallModal.install.title', { artifact: artifact })}
      strOKButtonText={
        loading ? t('PluginInstallModal.install.button_processing') : t('PluginInstallModal.install.button_idle')
      }
    >
      {hash == 'False' ? (
        <h3 style={{ color: 'red' }}>!!!!NO HASH PROVIDED!!!!</h3>
      ) : (
        t('PluginInstallModal.install.desc', { artifact: artifact, version: version })
      )}
    </ConfirmModal>
  );
};

export default PluginInstallModal;
