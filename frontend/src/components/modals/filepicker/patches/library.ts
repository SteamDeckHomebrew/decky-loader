import { Patch, findModuleChild, replacePatch } from 'decky-frontend-lib';

declare global {
  interface Window {
    SteamClient: any;
    appDetailsStore: any;
  }
}

let patch: Patch;

function rePatch() {
  // If you patch anything on SteamClient within the first few seconds of the client having loaded it will get redefined for some reason, so repatch any of these changes that occur within the first 20s of the last patch
  patch = replacePatch(window.SteamClient.Apps, 'PromptToChangeShortcut', async ([appid]: number[]) => {
    try {
      const details = window.appDetailsStore.GetAppDetails(appid);
      console.log(details);
      // strShortcutStartDir
      const file = await window.DeckyPluginLoader.openFilePicker(details.strShortcutStartDir.replaceAll('"', ''));
      console.log('user selected', file);
      window.SteamClient.Apps.SetShortcutExe(appid, JSON.stringify(file.path));
      const pathArr = file.path.split('/');
      pathArr.pop();
      const folder = pathArr.join('/');
      window.SteamClient.Apps.SetShortcutStartDir(appid, JSON.stringify(folder));
    } catch (e) {
      console.error(e);
    }
  });
}

// TODO type and add to frontend-lib
const History = findModuleChild((m) => {
  if (typeof m !== 'object') return undefined;
  for (let prop in m) {
    if (m[prop]?.m_history) return m[prop].m_history;
  }
});

export default async function libraryPatch() {
  try {
    rePatch();
    const unlisten = History.listen(() => {
      if (window.SteamClient.Apps.PromptToChangeShortcut !== patch.patchedFunction) {
        rePatch();
      }
    });

    return () => {
      patch.unpatch();
      unlisten();
    };
  } catch (e) {
    console.error('Error patching library file picker', e);
  }
  return () => {};
}
