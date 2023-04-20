import { ConfirmModal, Navigation, QuickAccessTab } from 'decky-frontend-lib';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InstallType } from '../../plugin';

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
      strTitle={() => {
        switch (installType) {
          case InstallType.INSTALL:
            return t('PluginInstallModal.install.title', { artifact: artifact });
          case InstallType.REINSTALL:
            return t('PluginInstallModal.reinstall.title', { artifact: artifact });
          case InstallType.UPDATE:
            return t('PluginInstallModal.update.title', { artifact: artifact });
          default:
            return '';
        }
      }}
      strOKButtonText={
        loading
          ? () => {
              switch (installType) {
                case InstallType.INSTALL:
                  return t('PluginInstallModal.install.button_processing');
                case InstallType.REINSTALL:
                  return t('PluginInstallModal.reinstall.button_processing');
                case InstallType.UPDATE:
                  return t('PluginInstallModal.update.button_processing');
                default:
                  return '';
              }
            }
          : () => {
              switch (installType) {
                case InstallType.INSTALL:
                  return t('PluginInstallModal.install.button_idle');
                case InstallType.REINSTALL:
                  return t('PluginInstallModal.reinstall.button_idle');
                case InstallType.UPDATE:
                  return t('PluginInstallModal.update.button_idle');
                default:
                  return '';
              }
            }
      }
    >
      {hash == 'False' ? (
        <h3 style={{ color: 'red' }}>!!!!NO HASH PROVIDED!!!!</h3>
      ) : (
        () => {
          switch (installType) {
            case InstallType.INSTALL:
              return t('PluginInstallModal.install.desc', { artifact: artifact, version: version });
            case InstallType.REINSTALL:
              return t('PluginInstallModal.reinstall.desc', { artifact: artifact, version: version });
            case InstallType.UPDATE:
              return t('PluginInstallModal.update.desc', { artifact: artifact, version: version });
            default:
              return '';
          }
        }
      )}
    </ConfirmModal>
  );
};

export default PluginInstallModal;
