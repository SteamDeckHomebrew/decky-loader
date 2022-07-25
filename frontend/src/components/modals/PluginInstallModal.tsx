import { ModalRoot, QuickAccessTab, Router, Spinner, sleep, staticClasses } from 'decky-frontend-lib';
import { FC, useState } from 'react';

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
    <ModalRoot
      bOKDisabled={loading}
      closeModal={closeModal}
      onOK={async () => {
        setLoading(true);
        await onOK();
        Router.NavigateBackOrOpenMenu();
        await sleep(250);
        setTimeout(() => Router.OpenQuickAccessMenu(QuickAccessTab.Decky), 1000);
      }}
      onCancel={async () => {
        await onCancel();
      }}
    >
      <div className={staticClasses.Title} style={{ flexDirection: 'column' }}>
        {hash == 'False' ? <h3 style={{ color: 'red' }}>!!!!NO HASH PROVIDED!!!!</h3> : null}
        <div style={{ flexDirection: 'row' }}>
          {loading && <Spinner style={{ width: '20px' }} />} {loading ? 'Installing' : 'Install'} {artifact}
          {version ? ' version ' + version : null}?
        </div>
      </div>
    </ModalRoot>
  );
};

export default PluginInstallModal;
