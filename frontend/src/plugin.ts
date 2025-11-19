import type { JSX } from 'react';
export enum PluginLoadType {
  LEGACY_EVAL_IIFE = 0, // legacy, uses legacy serverAPI
  ESMODULE_V1 = 1, // esmodule loading with modern @decky/backend apis
}

export interface Plugin {
  name: string;
  version?: string;
  loadType?: PluginLoadType;
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
  DOWNGRADE,
  OVERWRITE,
}

// values are the JSON keys used in the translation file
// IMPORTANT! keep in sync with `t(...)` comments where this is used
export const InstallTypeTranslationMapping = {
  [InstallType.INSTALL]: 'install',
  [InstallType.REINSTALL]: 'reinstall',
  [InstallType.UPDATE]: 'update',
  [InstallType.DOWNGRADE]: 'downgrade',
  [InstallType.OVERWRITE]: 'overwrite',
} as const satisfies Record<InstallType, string>;

type installPluginArgs = [
  artifact: string,
  name?: string,
  version?: string,
  hash?: string | boolean,
  installType?: InstallType,
];

export let installPlugin = DeckyBackend.callable<installPluginArgs>('utilities/install_plugin');

type installPluginsArgs = [
  requests: {
    artifact: string;
    name?: string;
    version?: string;
    hash?: string | boolean;
    installType?: InstallType;
  }[],
];

export let installPlugins = DeckyBackend.callable<installPluginsArgs>('utilities/install_plugins');

export let uninstallPlugin = DeckyBackend.callable<[name: string]>('utilities/uninstall_plugin');
