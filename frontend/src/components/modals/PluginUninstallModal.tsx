import { ConfirmModal, Spinner } from '@decky/ui';
import { FC, useState } from 'react';

import { uninstallPlugin } from '../../plugin';
import { DeckyState } from '../DeckyState';

interface PluginUninstallModalProps {
  deckyState: DeckyState
  name: string;
  title: string;
  buttonText: string;
  description: string;
  closeModal?(): void;
}

const PluginUninstallModal: FC<PluginUninstallModalProps> = ({ name, title, buttonText, description, deckyState, closeModal }) => {
  const [uninstalling, setUninstalling] = useState<boolean>(false);
  return (
    <ConfirmModal
      closeModal={closeModal}
      onOK={async () => {
        setUninstalling(true);
        await uninstallPlugin(name);
        deckyState.setDisabledPlugins(deckyState.publicState().disabledPlugins.filter(d => d.name !== name));
        // uninstalling a plugin resets the hidden setting for it server-side
        // we invalidate here so if you re-install it, you won't have an out-of-date hidden filter
        await DeckyPluginLoader.frozenPluginsService.invalidate();
        await DeckyPluginLoader.hiddenPluginsService.invalidate();
        closeModal?.();
      }}
      bOKDisabled={uninstalling}
      bCancelDisabled={uninstalling}
      strTitle={
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
          {title}
          {uninstalling && <Spinner width="24px" height="24px" style={{ marginLeft: 'auto' }} />}
        </div>
      }
      strOKButtonText={buttonText}
    >
      {description}
    </ConfirmModal>
  );
};

export default PluginUninstallModal;
