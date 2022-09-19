export enum Branches {
  Release,
  Prerelease,
  Nightly,
}

export interface DeckyUpdater {
  updateProgress: (val: number) => void;
  finish: () => void;
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

export async function callUpdaterMethod(methodName: string, args = {}) {
  const response = await fetch(`http://127.0.0.1:1337/updater/${methodName}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authentication: window.deckyAuthToken,
    },
    body: JSON.stringify(args),
  });

  return response.json();
}

export async function finishUpdate() {
  callUpdaterMethod('do_restart');
}
