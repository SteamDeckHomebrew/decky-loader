import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  joinClassNames,
  scrollClasses,
  staticClasses,
} from 'decky-frontend-lib';
import { VFC } from 'react';

import { useDeckyState } from './DeckyState';
import NotificationBadge from './NotificationBadge';
import { useQuickAccessVisible } from './QuickAccessVisibleState';

const PluginView: VFC = () => {
  const { plugins, updates, activePlugin, setActivePlugin } = useDeckyState();
  const visible = useQuickAccessVisible();

  if (!visible) {
    console.log('invisible');
    return null;
  }

  if (activePlugin) {
    return (
      <div
        className={joinClassNames(staticClasses.TabGroupPanel, scrollClasses.ScrollPanel, scrollClasses.ScrollY)}
        style={{ height: '100%' }}
      >
        {activePlugin.content}
      </div>
    );
  }
  return (
    <div className={joinClassNames(staticClasses.TabGroupPanel, scrollClasses.ScrollPanel, scrollClasses.ScrollY)}>
      <PanelSection>
        {plugins
          .filter((p) => p.content)
          .map(({ name, icon }) => (
            <PanelSectionRow key={name}>
              <ButtonItem layout="below" onClick={() => setActivePlugin(name)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {icon}
                  <div>{name}</div>
                  <NotificationBadge show={updates?.has(name)} style={{ top: '-5px', right: '-5px' }} />
                </div>
              </ButtonItem>
            </PanelSectionRow>
          ))}
      </PanelSection>
    </div>
  );
};

export default PluginView;
