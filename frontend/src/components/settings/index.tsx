import { SidebarNavigation } from 'decky-frontend-lib';
import { lazy } from 'react';
import { FaCode, FaPlug } from 'react-icons/fa';

import { useSetting } from '../../utils/hooks/useSetting';
import DeckyIcon from '../DeckyIcon';
import WithSuspense from '../WithSuspense';
import GeneralSettings from './pages/general';
import PluginList from './pages/plugin_list';

const DeveloperSettings = lazy(() => import('./pages/developer'));

export default function SettingsPage() {
  const [isDeveloper, setIsDeveloper] = useSetting<boolean>('developer.enabled', false);

  const pages = [
    {
      title: 'Decky',
      content: <GeneralSettings isDeveloper={isDeveloper} setIsDeveloper={setIsDeveloper} />,
      route: '/decky/settings/general',
      icon: <DeckyIcon />,
    },
    {
      title: 'Plugins',
      content: <PluginList />,
      route: '/decky/settings/plugins',
      icon: <FaPlug />,
    },
    {
      title: 'Developer',
      content: (
        <WithSuspense>
          <DeveloperSettings />
        </WithSuspense>
      ),
      route: '/decky/settings/developer',
      icon: <FaCode />,
      visible: isDeveloper,
    },
  ];

  return <SidebarNavigation pages={pages} />;
}
