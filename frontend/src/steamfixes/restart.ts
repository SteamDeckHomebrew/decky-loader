import { Export, Patch, findModuleExport, replacePatch, sleep } from '@decky/ui';

import Logger from '../logger';

const logger = new Logger('RestartSteamFix');

let patch: Patch;

function rePatch() {
  // If you patch anything on SteamClient within the first few seconds of the client having loaded it will get redefined for some reason, so repatch any of these changes that occur with History.listen or an interval
  patch = replacePatch(window.SteamClient.User, 'StartRestart', () => SteamClient.User.StartShutdown(false));
}

export default async function restartFix() {
  try {
    rePatch();
    // TODO type and add to frontend-lib
    let History: any;

    while (!History) {
      History = findModuleExport((e: Export) => e.m_history)?.m_history;
      if (!History) {
        logger.debug('Waiting 5s for history to become available.');
        await sleep(5000);
      }
    }

    function repatchIfNeeded() {
      if (window.SteamClient.User.StartRestart !== patch.patchedFunction) {
        rePatch();
      }
    }

    const unlisten = History.listen(repatchIfNeeded);

    // Just in case
    setTimeout(repatchIfNeeded, 5000);
    setTimeout(repatchIfNeeded, 10000);

    return () => {
      unlisten();
      patch.unpatch();
    };
  } catch (e) {
    logger.error('Error patching StartRestart', e);
  }
  return () => {};
}
