import { ConfirmModal, Spinner } from '@decky/ui';
import { FC, useState } from 'react';

import { disablePlugin } from '../../plugin';

interface PluginUninstallModalProps {
  name: string;
  title: string;
  buttonText: string;
  description: string;
  closeModal?(): void;
}

const PluginDisableModal: FC<PluginUninstallModalProps> = ({ name, title, buttonText, description, closeModal }) => {
  const [disabling, setDisabling] = useState<boolean>(false);
  return (
    <ConfirmModal
      closeModal={closeModal}
      onOK={async () => {
        setDisabling(true);
        await disablePlugin(name);
        closeModal?.();
      }}
      bOKDisabled={disabling}
      bCancelDisabled={disabling}
      strTitle={
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
          {title}
          {disabling && <Spinner width="24px" height="24px" style={{ marginLeft: 'auto' }} />}
        </div>
      }
      strOKButtonText={buttonText}
    >
      {description}
    </ConfirmModal>
  );
};

export default PluginDisableModal;
