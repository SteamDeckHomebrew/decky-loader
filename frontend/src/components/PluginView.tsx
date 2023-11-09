import { ButtonItem, Focusable, PanelSection, PanelSectionRow } from 'decky-frontend-lib';
import { VFC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEyeSlash } from 'react-icons/fa';

import { Plugin } from '../plugin';
import { useDeckyState } from './DeckyState';
import NotificationBadge from './NotificationBadge';
import { useQuickAccessVisible } from './QuickAccessVisibleState';
import TitleView from './TitleView';

const PluginView: VFC = () => {
  const { hiddenPlugins } = useDeckyState();
  const { plugins, updates, activePlugin, pluginOrder, setActivePlugin, closeActivePlugin } = useDeckyState();
  const visible = useQuickAccessVisible();
  const { t } = useTranslation();

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
        <div style={{ height: '100%', paddingTop: '16px' }}>
          {(visible || activePlugin.alwaysRender) && activePlugin.content}
        </div>
      </Focusable>
    );
  }
  return (
    <>
      <TitleView />
      <div
        style={{
          paddingTop: '16px',
        }}
      >
        <PanelSection>
          {pluginList
            .filter((p) => p.content)
            .filter(({ name }) => !hiddenPlugins.includes(name))
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
          {hiddenPlugins.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', marginTop: '10px' }}>
              <FaEyeSlash />
              <div>{t('PluginView.hidden', { count: hiddenPlugins.length })}</div>
            </div>
          )}
        </PanelSection>
      </div>
    </>
  );
};

export default PluginView;
