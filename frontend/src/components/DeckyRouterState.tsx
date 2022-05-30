import { ComponentType, FC, createContext, useContext, useEffect, useState } from 'react';

interface PublicDeckyRouterState {
  routes: Map<string, ComponentType>;
}

export class DeckyRouterState {
  private _routes: Map<string, ComponentType> = new Map<string, ComponentType>();

  public eventBus = new EventTarget();

  publicState(): PublicDeckyRouterState {
    return { routes: this._routes };
  }

  addRoute(path: string, render: ComponentType) {
    this._routes.set(path, render);
    this.notifyUpdate();
  }

  removeRoute(path: string) {
    this._routes.delete(path);
    this.notifyUpdate();
  }

  private notifyUpdate() {
    this.eventBus.dispatchEvent(new Event('update'));
  }
}

interface DeckyRouterStateContext extends PublicDeckyRouterState {
  addRoute(path: string, render: ComponentType): void;
  removeRoute(path: string): void;
}

const DeckyRouterStateContext = createContext<DeckyRouterStateContext>(null as any);

export const useDeckyRouterState = () => useContext(DeckyRouterStateContext);

interface Props {
  deckyRouterState: DeckyRouterState;
}

export const DeckyRouterStateContextProvider: FC<Props> = ({ children, deckyRouterState }) => {
  const [publicDeckyRouterState, setPublicDeckyRouterState] = useState<PublicDeckyRouterState>({
    ...deckyRouterState.publicState(),
  });

  useEffect(() => {
    function onUpdate() {
      setPublicDeckyRouterState({ ...deckyRouterState.publicState() });
    }

    deckyRouterState.eventBus.addEventListener('update', onUpdate);

    return () => deckyRouterState.eventBus.removeEventListener('update', onUpdate);
  }, []);

  const addRoute = (path: string, render: ComponentType) => deckyRouterState.addRoute(path, render);
  const removeRoute = (path: string) => deckyRouterState.removeRoute(path);

  return (
    <DeckyRouterStateContext.Provider value={{ ...publicDeckyRouterState, addRoute, removeRoute }}>
      {children}
    </DeckyRouterStateContext.Provider>
  );
};
