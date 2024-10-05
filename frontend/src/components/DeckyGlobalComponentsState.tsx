import { FC, ReactNode, createContext, useContext, useEffect, useState } from 'react';

import { UIMode } from '../enums';

interface PublicDeckyGlobalComponentsState {
  components: Map<UIMode, Map<string, FC>>;
}

export class DeckyGlobalComponentsState {
  // TODO a set would be better
  private _components = new Map<UIMode, Map<string, FC>>([
    [UIMode.BigPicture, new Map()],
    [UIMode.Desktop, new Map()],
  ]);

  public eventBus = new EventTarget();

  publicState(): PublicDeckyGlobalComponentsState {
    return { components: this._components };
  }

  addComponent(path: string, component: FC, uiMode: UIMode) {
    const components = this._components.get(uiMode);
    if (!components) throw new Error(`UI mode ${uiMode} not supported.`);

    components.set(path, component);
    this.notifyUpdate();
  }

  removeComponent(path: string, uiMode: UIMode) {
    const components = this._components.get(uiMode);
    if (!components) throw new Error(`UI mode ${uiMode} not supported.`);

    components.delete(path);
    this.notifyUpdate();
  }

  private notifyUpdate() {
    this.eventBus.dispatchEvent(new Event('update'));
  }
}

interface DeckyGlobalComponentsContext extends PublicDeckyGlobalComponentsState {
  addComponent(path: string, component: FC, uiMode: UIMode): void;
  removeComponent(path: string, uiMode: UIMode): void;
}

const DeckyGlobalComponentsContext = createContext<DeckyGlobalComponentsContext>(null as any);

export const useDeckyGlobalComponentsState = () => useContext(DeckyGlobalComponentsContext);

interface Props {
  deckyGlobalComponentsState: DeckyGlobalComponentsState;
  children: ReactNode;
}

export const DeckyGlobalComponentsStateContextProvider: FC<Props> = ({
  children,
  deckyGlobalComponentsState: deckyGlobalComponentsState,
}) => {
  const [publicDeckyGlobalComponentsState, setPublicDeckyGlobalComponentsState] =
    useState<PublicDeckyGlobalComponentsState>({
      ...deckyGlobalComponentsState.publicState(),
    });

  useEffect(() => {
    function onUpdate() {
      setPublicDeckyGlobalComponentsState({ ...deckyGlobalComponentsState.publicState() });
    }

    deckyGlobalComponentsState.eventBus.addEventListener('update', onUpdate);

    return () => deckyGlobalComponentsState.eventBus.removeEventListener('update', onUpdate);
  }, []);

  const addComponent = deckyGlobalComponentsState.addComponent.bind(deckyGlobalComponentsState);
  const removeComponent = deckyGlobalComponentsState.removeComponent.bind(deckyGlobalComponentsState);

  return (
    <DeckyGlobalComponentsContext.Provider
      value={{ ...publicDeckyGlobalComponentsState, addComponent, removeComponent }}
    >
      {children}
    </DeckyGlobalComponentsContext.Provider>
  );
};
