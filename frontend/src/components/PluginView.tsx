import { ButtonItem, PanelSection, PanelSectionRow } from 'decky-frontend-lib';
import { VFC } from 'react';

import { useDeckyState } from './DeckyState';

const PluginView: VFC = () => {
  const { plugins, activePlugin, setActivePlugin } = useDeckyState();

  if (activePlugin) {
    return <div style={{ height: '100%' }}>{activePlugin.content}</div>;
  }

  return (
    <PanelSection>
      {plugins
        .filter((p) => p.content)
        .map(({ name, icon }) => (
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
