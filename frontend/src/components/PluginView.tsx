import {
  ButtonItem,
  ErrorBoundary,
  Focusable,
  PanelSection,
  PanelSectionRow,
  joinClassNames,
  vrDashboardClasses,
} from '@decky/ui';
import { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBan, FaEyeSlash } from 'react-icons/fa';

import { useDeckyState } from './DeckyState';
import NotificationBadge from './NotificationBadge';
import { useQuickAccessVisible } from './QuickAccessVisibleState';
import TitleView from './TitleView';

const PluginView: FC<{ vr?: boolean }> = ({ vr }) => {
  const {
    plugins,
    disabledPlugins,
    hiddenPlugins,
    updates,
    activePlugin,
    pluginOrder,
    sortPlugins,
    setActivePlugin,
    closeActivePlugin,
  } = useDeckyState();
  const visible = useQuickAccessVisible();
  const { t } = useTranslation();

  const pluginList = useMemo(() => {
    console.log('updating PluginView after changes');

    return [...plugins]
      .sort((a, b) =>
        sortPlugins
          ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          : pluginOrder.indexOf(a.name) - pluginOrder.indexOf(b.name),
      )
      .filter((p) => p.content)
      .filter(({ name }) => !hiddenPlugins.includes(name));
  }, [plugins, pluginOrder, sortPlugins, hiddenPlugins]);

  const numberOfHidden = hiddenPlugins.filter((name) => !!plugins.find((p) => p.name === name)).length;

  if (activePlugin) {
    return (
      <Focusable
        onCancelButton={closeActivePlugin}
        className={
          (vr && joinClassNames(vrDashboardClasses.QuickAccessPopupPanel, vrDashboardClasses.BottomFade)) || ''
        }
        style={{
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: '20px', // override bottomfade, there is prolly a better way
        }}
      >
        <TitleView />
        <div style={{ paddingTop: '16px', overflowY: vr ? 'auto' : undefined }}>
          <ErrorBoundary>{(visible || activePlugin.alwaysRender) && activePlugin.content}</ErrorBoundary>
        </div>
      </Focusable>
    );
  }
  return (
    <div
      className={(vr && joinClassNames(vrDashboardClasses.QuickAccessPopupPanel, vrDashboardClasses.BottomFade)) || ''}
      style={{
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: '20px', // override bottomfade, there is prolly a better way
      }}
    >
      <TitleView />
      <div
        style={{
          paddingTop: vr ? '16px' : '16px',
          overflowY: vr ? 'auto' : undefined,
        }}
      >
        <PanelSection>
          {pluginList.map(({ name, icon }) => (
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              position: 'absolute',
              justifyContent: 'center',
              padding: '5px 0px',
            }}
          >
            {numberOfHidden > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                <FaEyeSlash />
                <div>{t('PluginView.hidden', { count: numberOfHidden })}</div>
              </div>
            )}
            {disabledPlugins.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                <FaBan />
                <div>{t('PluginView.disabled', { count: disabledPlugins.length })}</div>
              </div>
            )}
          </div>
        </PanelSection>
      </div>
    </div>
  );
};

export default PluginView;
