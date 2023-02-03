import {
  ButtonItem,
  Focusable,
  PanelSection,
  PanelSectionRow,
  joinClassNames,
  scrollClasses,
  staticClasses,
} from 'decky-frontend-lib';
import { VFC } from 'react';

import { useSetting } from '../utils/hooks/useSetting';
import { useDeckyState } from './DeckyState';
import NotificationBadge from './NotificationBadge';
import { useQuickAccessVisible } from './QuickAccessVisibleState';
import TitleView from './TitleView';

const PluginView: VFC = () => {
  const { plugins, updates, activePlugin, setActivePlugin, closeActivePlugin } = useDeckyState();
  const visible = useQuickAccessVisible();

  const [pluginOrder] = useSetting(
    'pluginOrder',
    plugins.map((plugin) => plugin.name),
  );

  if (activePlugin) {
    return (
      <Focusable onCancelButton={closeActivePlugin}>
        <TitleView />
        <div
          className={joinClassNames(staticClasses.TabGroupPanel, scrollClasses.ScrollPanel, scrollClasses.ScrollY)}
          style={{ height: '100%' }}
        >
          {(visible || activePlugin.alwaysRender) && activePlugin.content}
        </div>
      </Focusable>
    );
  }
  return (
    <>
      <TitleView />
      <div className={joinClassNames(staticClasses.TabGroupPanel, scrollClasses.ScrollPanel, scrollClasses.ScrollY)}>
        <PanelSection>
          {plugins
            .filter((p) => p.content)
            .sort((a, b) => pluginOrder.indexOf(a.name) - pluginOrder.indexOf(b.name))
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
    </>
  );
};

export default PluginView;
