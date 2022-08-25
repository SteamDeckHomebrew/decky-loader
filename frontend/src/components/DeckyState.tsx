import { FC, createContext, useContext, useEffect, useState } from 'react';

import { Plugin } from '../plugin';
import { PluginUpdateMapping } from '../store';

interface PublicDeckyState {
  plugins: Plugin[];
  activePlugin: Plugin | null;
  updates: PluginUpdateMapping | null;
  hasLoaderUpdate?: boolean;
  isLoaderUpdating: boolean;
}

export class DeckyState {
  private _plugins: Plugin[] = [];
  private _activePlugin: Plugin | null = null;
  private _updates: PluginUpdateMapping | null = null;
  private _hasLoaderUpdate: boolean = false;
  private _isLoaderUpdating: boolean = false;

  public eventBus = new EventTarget();

  publicState(): PublicDeckyState {
    return {
      plugins: this._plugins,
      activePlugin: this._activePlugin,
      updates: this._updates,
      hasLoaderUpdate: this._hasLoaderUpdate,
      isLoaderUpdating: this._isLoaderUpdating,
    };
  }

  setPlugins(plugins: Plugin[]) {
    this._plugins = plugins;
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
  setIsLoaderUpdating(hasUpdate: boolean): void;
  setActivePlugin(name: string): void;
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
  const setActivePlugin = (name: string) => deckyState.setActivePlugin(name);
  const closeActivePlugin = () => deckyState.closeActivePlugin();

  return (
    <DeckyStateContext.Provider
      value={{ ...publicDeckyState, setIsLoaderUpdating, setActivePlugin, closeActivePlugin }}
    >
      {children}
    </DeckyStateContext.Provider>
  );
};
