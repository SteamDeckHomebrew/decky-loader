import { SidebarNavigation } from 'decky-frontend-lib';

import GeneralSettings from './pages/GeneralSettings';

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
      ]}
    />
  );
}
