import { Patch, findModuleChild, replacePatch, sleep } from 'decky-frontend-lib';

import Logger from '../../../../logger';

const logger = new Logger('LibraryPatch');

let patch: Patch;

function rePatch() {
  // If you patch anything on SteamClient within the first few seconds of the client having loaded it will get redefined for some reason, so repatch any of these changes that occur with History.listen or an interval
  patch = replacePatch(window.SteamClient.Apps, 'PromptToChangeShortcut', async ([appid]: number[]) => {
    try {
      const details = window.appDetailsStore.GetAppDetails(appid);
      logger.debug('game details', details);
      // strShortcutStartDir
      const file = await window.DeckyPluginLoader.openFilePicker(
        details?.strShortcutStartDir.replaceAll('"', '') || '/',
      );
      logger.debug('user selected', file);
      window.SteamClient.Apps.SetShortcutExe(appid, JSON.stringify(file.path));
      const pathArr = file.path.split('/');
      pathArr.pop();
      const folder = pathArr.join('/');
      window.SteamClient.Apps.SetShortcutStartDir(appid, JSON.stringify(folder));
    } catch (e) {
      logger.error(e);
    }
  });
}

export default async function libraryPatch() {
  try {
    rePatch();
    // TODO type and add to frontend-lib
    let History: any;

    while (!History) {
      History = findModuleChild((m) => {
        if (typeof m !== 'object') return undefined;
        for (let prop in m) {
          if (m[prop]?.m_history) return m[prop].m_history;
        }
      });
      if (!History) {
        logger.debug('Waiting 5s for history to become available.');
        await sleep(5000);
      }
    }

    const unlisten = History.listen(() => {
      if (window.SteamClient.Apps.PromptToChangeShortcut !== patch.patchedFunction) {
        rePatch();
      }
    });

    return () => {
      unlisten();
      patch.unpatch();
    };
  } catch (e) {
    logger.error('Error patching library file picker', e);
  }
  return () => {};
}
