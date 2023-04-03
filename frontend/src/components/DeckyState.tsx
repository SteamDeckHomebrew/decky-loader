import { FC, createContext, useContext, useEffect, useState } from 'react';

import { Plugin } from '../plugin';
import { PluginUpdateMapping } from '../store';
import { VerInfo } from '../updater';

interface PublicDeckyState {
  plugins: Plugin[];
  pluginOrder: string[];
  activePlugin: Plugin | null;
  updates: PluginUpdateMapping | null;
  hasLoaderUpdate?: boolean;
  isLoaderUpdating: boolean;
  versionInfo: VerInfo | null;
}

export class DeckyState {
  private _plugins: Plugin[] = [];
  private _pluginOrder: string[] = [];
  private _activePlugin: Plugin | null = null;
  private _updates: PluginUpdateMapping | null = null;
  private _hasLoaderUpdate: boolean = false;
  private _isLoaderUpdating: boolean = false;
  private _versionInfo: VerInfo | null = null;

  public eventBus = new EventTarget();

  publicState(): PublicDeckyState {
    return {
      plugins: this._plugins,
      pluginOrder: this._pluginOrder,
      activePlugin: this._activePlugin,
      updates: this._updates,
      hasLoaderUpdate: this._hasLoaderUpdate,
      isLoaderUpdating: this._isLoaderUpdating,
      versionInfo: this._versionInfo,
    };
  }

  setVersionInfo(versionInfo: VerInfo) {
    this._versionInfo = versionInfo;
    this.notifyUpdate();
  }

  setPlugins(plugins: Plugin[]) {
    this._plugins = plugins;
    this.notifyUpdate();
  }

  setPluginOrder(pluginOrder: string[]) {
    this._pluginOrder = pluginOrder;
    this.notifyUpdate();
  }

  setActivePlugin(name: string) {
    this._activePlugin = this._plugins.find((plugin) => plugin.name === name) ?? null;
    this.notifyUpdate();
  }

  closeActivePlugin() {
    this._activePlugin = null;
    this.notifyUpdate();
  }

  setUpdates(updates: PluginUpdateMapping) {
    this._updates = updates;
    this.notifyUpdate();
  }

  setHasLoaderUpdate(hasUpdate: boolean) {
    this._hasLoaderUpdate = hasUpdate;
    this.notifyUpdate();
  }

  setIsLoaderUpdating(isUpdating: boolean) {
    this._isLoaderUpdating = isUpdating;
    this.notifyUpdate();
  }

  private notifyUpdate() {
    this.eventBus.dispatchEvent(new Event('update'));
  }
}

interface DeckyStateContext extends PublicDeckyState {
  setVersionInfo(versionInfo: VerInfo): void;
  setIsLoaderUpdating(hasUpdate: boolean): void;
  setActivePlugin(name: string): void;
  setPluginOrder(pluginOrder: string[]): void;
  closeActivePlugin(): void;
}

const DeckyStateContext = createContext<DeckyStateContext>(null as any);

export const useDeckyState = () => useContext(DeckyStateContext);

interface Props {
  deckyState: DeckyState;
}

export const DeckyStateContextProvider: FC<Props> = ({ children, deckyState }) => {
  const [publicDeckyState, setPublicDeckyState] = useState<PublicDeckyState>({ ...deckyState.publicState() });

  useEffect(() => {
    function onUpdate() {
      setPublicDeckyState({ ...deckyState.publicState() });
    }

    deckyState.eventBus.addEventListener('update', onUpdate);

    return () => deckyState.eventBus.removeEventListener('update', onUpdate);
  }, []);

  const setIsLoaderUpdating = (hasUpdate: boolean) => deckyState.setIsLoaderUpdating(hasUpdate);
  const setVersionInfo = (versionInfo: VerInfo) => deckyState.setVersionInfo(versionInfo);
  const setActivePlugin = (name: string) => deckyState.setActivePlugin(name);
  const closeActivePlugin = () => deckyState.closeActivePlugin();
  const setPluginOrder = (pluginOrder: string[]) => deckyState.setPluginOrder(pluginOrder);

  return (
    <DeckyStateContext.Provider
      value={{
        ...publicDeckyState,
        setIsLoaderUpdating,
        setVersionInfo,
        setActivePlugin,
        closeActivePlugin,
        setPluginOrder,
      }}
    >
      {children}
    </DeckyStateContext.Provider>
  );
};
