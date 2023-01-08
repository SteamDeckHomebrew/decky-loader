import Logger from '../logger';

const logger = new Logger('ReloadSteamFix');

export default function reloadFix() {
  // Hack to unbreak the ui when reloading it
  if (window.FocusNavController?.m_rgAllContexts?.length == 0) {
    SteamClient.URL.ExecuteSteamURL('steam://open/settings');
    logger.log('Applied UI reload fix.');
  }

  // This steamfix does not need to deinit.
  return () => {};
}
