export enum Branches {
  Release,
  Prerelease,
  // Testing,
}

export interface RemoteVerInfo {
  assets: {
    browser_download_url: string;
    created_at: string;
  }[];
  name: string;
  body: string;
  prerelease: boolean;
  published_at: string;
  tag_name: string;
}

export interface VerInfo {
  current: string;
  remote: RemoteVerInfo | null;
  all: RemoteVerInfo[] | null;
  updatable: boolean;
}

export const doUpdate = DeckyBackend.callable('updater/do_update');
export const doRestart = DeckyBackend.callable('updater/do_restart');
export const doShutdown = DeckyBackend.callable('updater/do_shutdown');
export const getVersionInfo = DeckyBackend.callable<[], VerInfo>('updater/get_version_info');
export const checkForUpdates = DeckyBackend.callable<[], VerInfo>('updater/check_for_updates');
