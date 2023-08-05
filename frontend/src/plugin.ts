export interface Plugin {
  name: string;
  version?: string;
  icon: JSX.Element;
  content?: JSX.Element;
  onDismount?(): void;
  alwaysRender?: boolean;
  titleView?: JSX.Element;
}

export enum InstallType {
  INSTALL,
  REINSTALL,
  UPDATE,
}

type installPluginArgs = [
  artifact: string,
  name?: string,
  version?: string,
  hash?: string | boolean,
  installType?: InstallType,
];

export let installPlugin = window.DeckyBackend.callable<installPluginArgs>('utilities/install_plugin');

type installPluginsArgs = [
  requests: {
    artifact: string;
    name?: string;
    version?: string;
    hash?: string | boolean;
    installType?: InstallType;
  }[],
];

export let installPlugins = window.DeckyBackend.callable<installPluginsArgs>('utilities/install_plugins');

export let uninstallPlugin = window.DeckyBackend.callable<[name: string]>('utilities/uninstall_plugin');
