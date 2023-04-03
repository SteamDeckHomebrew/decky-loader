import {
  ButtonItem,
  Focusable,
  PanelSection,
  PanelSectionRow,
  joinClassNames,
  scrollClasses,
  staticClasses,
} from 'decky-frontend-lib';
import { VFC, useEffect, useState } from 'react';

import { Plugin } from '../plugin';
import { useDeckyState } from './DeckyState';
import NotificationBadge from './NotificationBadge';
import { useQuickAccessVisible } from './QuickAccessVisibleState';
import TitleView from './TitleView';

const PluginView: VFC = () => {
  const { plugins, updates, activePlugin, pluginOrder, setActivePlugin, closeActivePlugin } = useDeckyState();
  const visible = useQuickAccessVisible();

  const [pluginList, setPluginList] = useState<Plugin[]>(
    plugins.sort((a, b) => pluginOrder.indexOf(a.name) - pluginOrder.indexOf(b.name)),
  );

  useEffect(() => {
    setPluginList(plugins.sort((a, b) => pluginOrder.indexOf(a.name) - pluginOrder.indexOf(b.name)));
    console.log('updating PluginView after changes');
  }, [plugins, pluginOrder]);

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
          {pluginList
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
    </>
  );
};

export default PluginView;
