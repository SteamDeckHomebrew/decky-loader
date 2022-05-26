import { FC, createContext, useContext, useEffect, useState } from 'react';

import { Plugin } from '../plugin';

interface PublicDeckyState {
  plugins: Plugin[];
  activePlugin: Plugin | null;
}

export class DeckyState {
  private _plugins: Plugin[] = [];
  private _activePlugin: Plugin | null = null;

  public eventBus = new EventTarget();

  publicState(): PublicDeckyState {
    return { plugins: this._plugins, activePlugin: this._activePlugin };
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

  private notifyUpdate() {
    this.eventBus.dispatchEvent(new Event('update'));
  }
}

interface DeckyStateContext extends PublicDeckyState {
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

  const setActivePlugin = (name: string) => deckyState.setActivePlugin(name);
  const closeActivePlugin = () => deckyState.closeActivePlugin();

  return (
    <DeckyStateContext.Provider value={{ ...publicDeckyState, setActivePlugin, closeActivePlugin }}>
      {children}
    </DeckyStateContext.Provider>
  );
};
