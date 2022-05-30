import { ComponentType, FC, createContext, useContext, useEffect, useState } from 'react';
import { RouteProps } from 'react-router';

export interface RouterEntry {
  props: Omit<RouteProps, 'path' | 'children'>;
  component: ComponentType;
}

interface PublicDeckyRouterState {
  routes: Map<string, RouterEntry>;
}

export class DeckyRouterState {
  private _routes = new Map<string, RouterEntry>();

  public eventBus = new EventTarget();

  publicState(): PublicDeckyRouterState {
    return { routes: this._routes };
  }

  addRoute(path: string, component: RouterEntry['component'], props: RouterEntry['props'] = {}) {
    this._routes.set(path, { props, component });
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
  addRoute(path: string, component: RouterEntry['component'], props: RouterEntry['props']): void;
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

  const addRoute = (path: string, component: RouterEntry['component'], props: RouterEntry['props'] = {}) =>
    deckyRouterState.addRoute(path, component, props);
  const removeRoute = (path: string) => deckyRouterState.removeRoute(path);

  return (
    <DeckyRouterStateContext.Provider value={{ ...publicDeckyRouterState, addRoute, removeRoute }}>
      {children}
    </DeckyRouterStateContext.Provider>
  );
};
