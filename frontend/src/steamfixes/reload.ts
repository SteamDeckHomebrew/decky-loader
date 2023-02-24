import { getFocusNavController, sleep } from 'decky-frontend-lib';

import Logger from '../logger';

const logger = new Logger('ReloadSteamFix');

declare global {
  var GamepadNavTree: any;
}

export default async function reloadFix() {
  // Hack to unbreak the ui when reloading it
  await sleep(4000);
  if (getFocusNavController()?.m_rgAllContexts?.length == 0) {
    SteamClient.URL.ExecuteSteamURL('steam://open/settings');
    logger.log('Applied UI reload fix.');
  }

  // This steamfix does not need to deinit.
  return () => {};
}
