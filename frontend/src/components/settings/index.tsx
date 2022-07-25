import { SidebarNavigation } from 'decky-frontend-lib';

import GeneralSettings from './pages/general';
import PluginList from './pages/plugin_list';

export default function SettingsPage() {
  return (
    <SidebarNavigation
      title="Decky Settings"
      showTitle
      pages={[
        {
          title: 'General',
          content: <GeneralSettings />,
          route: '/decky/settings/general',
        },
        {
          title: 'Plugins',
          content: <PluginList />,
          route: '/decky/settings/plugins',
        },
      ]}
    />
  );
}
