import { SidebarNavigation } from 'decky-frontend-lib';
import { lazy } from 'react';
import { useTranslation } from 'react-i18next';

import { useSetting } from '../../utils/hooks/useSetting';
import WithSuspense from '../WithSuspense';
import GeneralSettings from './pages/general';
import PluginList from './pages/plugin_list';

const DeveloperSettings = lazy(() => import('./pages/developer'));

export default function SettingsPage() {
  const [isDeveloper, setIsDeveloper] = useSetting<boolean>('developer.enabled', false);
  const { t } = useTranslation();

  const pages = [
    {
      title: t('SettingsIndex.general_title'),
      content: <GeneralSettings isDeveloper={isDeveloper} setIsDeveloper={setIsDeveloper} />,
      route: '/decky/settings/general',
    },
    {
      title: t('SettingsIndex.plugins_title'),
      content: <PluginList />,
      route: '/decky/settings/plugins',
    },
  ];

  if (isDeveloper)
    pages.push({
      title: t('SettingsIndex.developer_title'),
      content: (
        <WithSuspense>
          <DeveloperSettings />
        </WithSuspense>
      ),
      route: '/decky/settings/developer',
    });

  return <SidebarNavigation title={t('SettingsIndex.settings_navbar') as string} showTitle pages={pages} />;
}
