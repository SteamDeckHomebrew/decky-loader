import { ComponentType, FC, ReactNode, createContext, useContext, useEffect, useState } from 'react';
import type { RouteProps } from 'react-router';

import { UIMode } from '../enums';

export interface RouterEntry {
  props: Omit<RouteProps, 'path' | 'children'>;
  component: ComponentType;
}

export type RoutePatch = (route: RouteProps) => RouteProps;

interface PublicDeckyRouterState {
  routes: Map<string, RouterEntry>;
  routePatches: Map<UIMode, Map<string, Set<RoutePatch>>>;
}

export class DeckyRouterState {
  private _routes = new Map<string, RouterEntry>();
  // Update when support for new UIModes is added
  private _routePatches = new Map<UIMode, Map<string, Set<RoutePatch>>>([
    [UIMode.BigPicture, new Map()],
    [UIMode.Desktop, new Map()],
  ]);

  public eventBus = new EventTarget();

  publicState(): PublicDeckyRouterState {
    return { routes: this._routes, routePatches: this._routePatches };
  }

  addRoute(path: string, component: RouterEntry['component'], props: RouterEntry['props'] = {}) {
    this._routes.set(path, { props, component });
    this.notifyUpdate();
  }

  addPatch(path: string, patch: RoutePatch, uiMode: UIMode) {
    const patchesForMode = this._routePatches.get(uiMode);
    if (!patchesForMode) throw new Error(`UI mode ${uiMode} not supported.`);
    let patchList = patchesForMode.get(path);
    if (!patchList) {
      patchList = new Set();
      patchesForMode.set(path, patchList);
    }
    patchList.add(patch);
    this.notifyUpdate();
    return patch;
  }

  removePatch(path: string, patch: RoutePatch, uiMode: UIMode) {
    const patchesForMode = this._routePatches.get(uiMode);
    if (!patchesForMode) throw new Error(`UI mode ${uiMode} not supported.`);
    const patchList = patchesForMode.get(path);
    patchList?.delete(patch);
    if (patchList?.size == 0) {
      patchesForMode.delete(path);
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
  addPatch(path: string, patch: RoutePatch, uiMode?: UIMode): RoutePatch;
  removePatch(path: string, patch: RoutePatch, uiMode?: UIMode): void;
  removeRoute(path: string): void;
}

const DeckyRouterStateContext = createContext<DeckyRouterStateContext>(null as any);

export const useDeckyRouterState = () => useContext(DeckyRouterStateContext);

interface Props {
  deckyRouterState: DeckyRouterState;
  children: ReactNode;
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
