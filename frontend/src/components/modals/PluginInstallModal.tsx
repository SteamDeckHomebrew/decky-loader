import { ConfirmModal, Navigation, QuickAccessTab } from 'decky-frontend-lib';
import { FC, useState } from 'react';
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
      strTitle={
        <div>
          <TranslationHelper
            trans_class={TranslationClass.PLUGIN_INSTALL_MODAL}
            trans_text="title"
            i18n_args={{ artifact: artifact }}
            install_type={installType}
          />
        </div>
      }
      strOKButtonText={
        loading ? (
          <div>
            <TranslationHelper
              trans_class={TranslationClass.PLUGIN_INSTALL_MODAL}
              trans_text="button_processing"
              install_type={installType}
            />
          </div>
        ) : (
          <div>
            <TranslationHelper
              trans_class={TranslationClass.PLUGIN_INSTALL_MODAL}
              trans_text="button_idle"
              install_type={installType}
            />
          </div>
        )
      }
    >
      <div>
        <TranslationHelper
          trans_class={TranslationClass.PLUGIN_INSTALL_MODAL}
          trans_text="desc"
          i18n_args={{
            artifact: artifact,
            version: version,
          }}
          install_type={installType}
        />
      </div>
      {hash == 'False' && <span style={{ color: 'red' }}>{t('PluginInstallModal.no_hash')}</span>}
    </ConfirmModal>
  );
};

export default PluginInstallModal;
