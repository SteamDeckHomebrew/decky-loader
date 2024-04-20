import { ConfirmModal, Navigation, QuickAccessTab } from 'decky-frontend-lib';
import { FC, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

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
        setTimeout(() => window.DeckyPluginLoader.checkPluginUpdates(), 1000);
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
                {hash === 'False' && (
                  <div style={{ color: 'red', paddingLeft: '10px' }}>{t('PluginInstallModal.no_hash')}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </ConfirmModal>
  );
};

export default MultiplePluginsInstallModal;
