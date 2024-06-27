import { ConfirmModal } from '@decky/ui';
import { FC } from 'react';

import { uninstallPlugin } from '../../plugin';

interface PluginUninstallModalProps {
  name: string;
  title: string;
  buttonText: string;
  description: string;
  closeModal?(): void;
}

const PluginUninstallModal: FC<PluginUninstallModalProps> = ({ name, title, buttonText, description, closeModal }) => {
  return (
    <ConfirmModal
      closeModal={closeModal}
      onOK={async () => {
        await uninstallPlugin(name);
        // uninstalling a plugin resets the hidden setting for it server-side
        // we invalidate here so if you re-install it, you won't have an out-of-date hidden filter
        await DeckyPluginLoader.frozenPluginsService.invalidate();
        await DeckyPluginLoader.hiddenPluginsService.invalidate();
        closeModal?.();
      }}
      strTitle={title}
      strOKButtonText={buttonText}
    >
      {description}
    </ConfirmModal>
  );
};

export default PluginUninstallModal;
