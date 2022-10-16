import { SidebarNavigation } from 'decky-frontend-lib';
import { lazy } from 'react';

import { useSetting } from '../../utils/hooks/useSetting';
import WithSuspense from '../WithSuspense';
import GeneralSettings from './pages/general';
import PluginList from './pages/plugin_list';

const DeveloperSettings = lazy(() => import('./pages/developer'));

export default function SettingsPage() {
  const [isDeveloper, setIsDeveloper] = useSetting<boolean>('developer.enabled', false);

  const pages = [
    {
      title: 'General',
      content: <GeneralSettings isDeveloper={isDeveloper} setIsDeveloper={setIsDeveloper} />,
      route: '/decky/settings/general',
    },
    {
      title: 'Plugins',
      content: <PluginList />,
      route: '/decky/settings/plugins',
    },
  ];

  if (isDeveloper)
    pages.push({
      title: 'Developer',
      content: (
        <WithSuspense>
          <DeveloperSettings />
        </WithSuspense>
      ),
      route: '/decky/settings/developer',
    });

  return <SidebarNavigation title="Decky Settings" showTitle pages={pages} />;
}
