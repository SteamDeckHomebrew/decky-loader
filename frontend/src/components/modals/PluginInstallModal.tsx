import { ConfirmModal, Navigation, QuickAccessTab } from 'decky-frontend-lib';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

const { t } = useTranslation('PluginInstallModal');

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
      strTitle={t('install_title', artifact)}
      strOKButtonText={loading ? t('install_button_processing') : t('install_button_idle')}
    >
      {hash == 'False' ? (
        <h3 style={{ color: 'red' }}>!!!!NO HASH PROVIDED!!!!</h3>
      ) : (
        t('install_desc', artifact, version)
      )}
    </ConfirmModal>
  );
};

export default PluginInstallModal;
