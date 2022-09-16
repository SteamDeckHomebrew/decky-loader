import { Patch, replacePatch, sleep } from 'decky-frontend-lib';

declare global {
  interface Window {
    SteamClient: any;
    appDetailsStore: any;
  }
}

let patch: Patch;

function rePatch() {
  // If you patch anything on SteamClient within the first few seconds of the client having loaded it will get redefined for some reason, so repatch any of these changes that occur within the first minute of the client loading
  patch?.unpatch();
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

export default async function libraryPatch() {
  await sleep(10000);
  rePatch();
  await sleep(10000);
  rePatch();

  return () => {
    patch.unpatch();
  };
}
