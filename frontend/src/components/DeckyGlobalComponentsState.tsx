import { FC, createContext, useContext, useEffect, useState } from 'react';

interface PublicDeckyGlobalComponentsState {
  components: Map<string, FC>;
}

export class DeckyGlobalComponentsState {
  // TODO a set would be better
  private _components = new Map<string, FC>();

  public eventBus = new EventTarget();

  publicState(): PublicDeckyGlobalComponentsState {
    return { components: this._components };
  }

  addComponent(name: string, component: FC) {
    this._components.set(name, component);
    this.notifyUpdate();
  }

  removeComponent(name: string) {
    this._components.delete(name);
    this.notifyUpdate();
  }

  private notifyUpdate() {
    this.eventBus.dispatchEvent(new Event('update'));
  }
}

interface DeckyGlobalComponentsContext extends PublicDeckyGlobalComponentsState {
  addComponent(name: string, component: FC): void;
  removeComponent(name: string): void;
}

const DeckyGlobalComponentsContext = createContext<DeckyGlobalComponentsContext>(null as any);

export const useDeckyGlobalComponentsState = () => useContext(DeckyGlobalComponentsContext);

interface Props {
  deckyGlobalComponentsState: DeckyGlobalComponentsState;
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
