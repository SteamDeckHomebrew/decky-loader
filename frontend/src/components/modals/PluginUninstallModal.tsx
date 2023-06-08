import { ConfirmModal } from 'decky-frontend-lib';
import { FC } from 'react';

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
        await window.DeckyPluginLoader.callServerMethod('uninstall_plugin', { name });
        // uninstalling a plugin resets the hidden setting for it server-side
        // we invalidate here so if you re-install it, you won't have an out-of-date hidden filter
        await window.DeckyPluginLoader.hiddenPluginsService.invalidate();
      }}
      strTitle={title}
      strOKButtonText={buttonText}
    >
      {description}
    </ConfirmModal>
  );
};

export default PluginUninstallModal;
