import { ComponentType, FC, createContext, useContext, useEffect, useState } from 'react';
import type { RouteProps } from 'react-router';

export interface RouterEntry {
  props: Omit<RouteProps, 'path' | 'children'>;
  component: ComponentType;
}

export type RoutePatch = (route: RouteProps) => RouteProps;

interface PublicDeckyRouterState {
  routes: Map<string, RouterEntry>;
  routePatches: Map<string, Set<RoutePatch>>;
}

export class DeckyRouterState {
  private _routes = new Map<string, RouterEntry>();
  private _routePatches = new Map<string, Set<RoutePatch>>();

  public eventBus = new EventTarget();

  publicState(): PublicDeckyRouterState {
    return { routes: this._routes, routePatches: this._routePatches };
  }

  addRoute(path: string, component: RouterEntry['component'], props: RouterEntry['props'] = {}) {
    this._routes.set(path, { props, component });
    this.notifyUpdate();
  }

  addPatch(path: string, patch: RoutePatch) {
    let patchList = this._routePatches.get(path);
    if (!patchList) {
      patchList = new Set();
      this._routePatches.set(path, patchList);
    }
    patchList.add(patch);
    this.notifyUpdate();
    return patch;
  }

  removePatch(path: string, patch: RoutePatch) {
    const patchList = this._routePatches.get(path);
    patchList?.delete(patch);
    if (patchList?.size == 0) {
      this._routePatches.delete(path);
    }
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
  addPatch(path: string, patch: RoutePatch): RoutePatch;
  removePatch(path: string, patch: RoutePatch): void;
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

  const addRoute = deckyRouterState.addRoute.bind(deckyRouterState);
  const addPatch = deckyRouterState.addPatch.bind(deckyRouterState);
  const removePatch = deckyRouterState.removePatch.bind(deckyRouterState);
  const removeRoute = deckyRouterState.removeRoute.bind(deckyRouterState);

  return (
    <DeckyRouterStateContext.Provider
      value={{ ...publicDeckyRouterState, addRoute, addPatch, removePatch, removeRoute }}
    >
      {children}
    </DeckyRouterStateContext.Provider>
  );
};
