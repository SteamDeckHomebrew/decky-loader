import { ConfirmModal, Navigation, QuickAccessTab } from 'decky-frontend-lib';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  var tUpdateTitles = [
    t('PluginInstallModal.install.title', { artifact: artifact }),
    t('PluginInstallModal.reinstall.title', { artifact: artifact }),
    t('PluginInstallModal.update.title', { artifact: artifact }),
  ];

  var tUpdateDescs = [
    t('PluginInstallModal.install.desc', { artifact: artifact, version: version }),
    t('PluginInstallModal.reinstall.desc', { artifact: artifact, version: version }),
    t('PluginInstallModal.update.desc', { artifact: artifact, version: version }),
  ];

  var tUpdatesButtonIdle = [
    t('PluginInstallModal.install.button_idle'),
    t('PluginInstallModal.reinstall.button_idle'),
    t('PluginInstallModal.update.button_idle'),
  ];

  var tUpdatesButtonProc = [
    t('PluginInstallModal.install.button_processing'),
    t('PluginInstallModal.reinstall.button_processing'),
    t('PluginInstallModal.update.button_processing'),
  ];

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
      strTitle={tUpdateTitles[installType]}
      strOKButtonText={loading ? tUpdatesButtonProc[installType] : tUpdatesButtonIdle[installType]}
    >
      {hash == 'False' ? <h3 style={{ color: 'red' }}>!!!!NO HASH PROVIDED!!!!</h3> : tUpdateDescs[installType]}
    </ConfirmModal>
  );
};

export default PluginInstallModal;
