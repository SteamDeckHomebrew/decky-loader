import { ButtonItem, DialogButton, PanelSection, PanelSectionRow } from 'decky-frontend-lib';
import { VFC } from 'react';
import { FaArrowLeft } from 'react-icons/fa';

import { useDeckyState } from './DeckyState';

const PluginView: VFC = () => {
  const { plugins, activePlugin, setActivePlugin, closeActivePlugin } = useDeckyState();

  if (activePlugin) {
    return (
      <div>
        <div style={{ position: 'absolute', top: '3px', left: '16px', zIndex: 20 }}>
          <DialogButton style={{ minWidth: 0, padding: '10px 12px' }} onClick={closeActivePlugin}>
            <FaArrowLeft style={{ display: 'block' }} />
          </DialogButton>
        </div>
        {activePlugin.content}
      </div>
    );
  }

  return (
    <PanelSection>
      {plugins.map(({ name, icon }) => (
        <PanelSectionRow key={name}>
          <ButtonItem layout="below" onClick={() => setActivePlugin(name)}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>{icon}</div>
              <div>{name}</div>
            </div>
          </ButtonItem>
        </PanelSectionRow>
      ))}
    </PanelSection>
  );
};

export default PluginView;
