import { ConfirmModal, Navigation, QuickAccessTab } from 'decky-frontend-lib';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import TPluginInstallModal, { TranslatedPart } from './TPluginInstallModal';

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
      strTitle={<TPluginInstallModal trans_part={TranslatedPart.TITLE} trans_type={installType} artifact={artifact} />}
      strOKButtonText={
        loading ? (
          <TPluginInstallModal trans_part={TranslatedPart.BUTTON_PROC} trans_type={installType} />
        ) : (
          <TPluginInstallModal trans_part={TranslatedPart.BUTTON_IDLE} trans_type={installType} />
        )
      }
    >
      <TPluginInstallModal
        trans_part={TranslatedPart.DESC}
        trans_type={installType}
        artifact={artifact}
        version={version ? version : ''}
      />
      {hash == 'False' && <span style={{ color: 'red' }}>{t('PluginInstallModal.no_hash')}</span>}
    </ConfirmModal>
  );
};

export default PluginInstallModal;
