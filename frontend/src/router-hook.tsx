import { Patch, afterPatch, findModuleChild } from 'decky-frontend-lib';
import { FC, ReactElement, ReactNode, cloneElement, createElement, memo } from 'react';
import type { Route } from 'react-router';

import {
  DeckyGlobalComponentsState,
  DeckyGlobalComponentsStateContextProvider,
  useDeckyGlobalComponentsState,
} from './components/DeckyGlobalComponentsState';
import {
  DeckyRouterState,
  DeckyRouterStateContextProvider,
  RoutePatch,
  RouterEntry,
  useDeckyRouterState,
} from './components/DeckyRouterState';
import Logger from './logger';

declare global {
  interface Window {
    __ROUTER_HOOK_INSTANCE: any;
  }
}

const isPatched = Symbol('is patched');

class RouterHook extends Logger {
  private router: any;
  private memoizedRouter: any;
  private gamepadWrapper: any;
  private routerState: DeckyRouterState = new DeckyRouterState();
  private globalComponentsState: DeckyGlobalComponentsState = new DeckyGlobalComponentsState();
  private wrapperPatch: Patch;
  private routerPatch?: Patch;
  public routes?: any[];

  constructor() {
    super('RouterHook');

    this.log('Initialized');
    window.__ROUTER_HOOK_INSTANCE?.deinit?.();
    window.__ROUTER_HOOK_INSTANCE = this;

    this.gamepadWrapper = findModuleChild((m) => {
      if (typeof m !== 'object') return undefined;
      for (let prop in m) {
        if (m[prop]?.render?.toString()?.includes('["flow-children","onActivate","onCancel","focusClassName",'))
          return m[prop];
      }
    });

    let Route: new () => Route;
    // Used to store the new replicated routes we create to allow routes to be unpatched.
    const processList = (
      routeList: any[],
      routes: Map<string, RouterEntry> | null,
      routePatches: Map<string, Set<RoutePatch>>,
      save: boolean,
    ) => {
      this.debug('Route list: ', routeList);
      if (save) this.routes = routeList;
      let routerIndex = routeList.length;
      if (routes) {
        if (!routeList[routerIndex - 1]?.length || routeList[routerIndex - 1]?.length !== routes.size) {
          if (routeList[routerIndex - 1]?.length && routeList[routerIndex - 1].length !== routes.size) routerIndex--;
          const newRouterArray: ReactElement[] = [];
          routes.forEach(({ component, props }, path) => {
            newRouterArray.push(
              <Route path={path} {...props}>
                {createElement(component)}
              </Route>,
            );
          });
          routeList[routerIndex] = newRouterArray;
        }
      }
      routeList.forEach((route: Route, index: number) => {
        const replaced = toReplace.get(route?.props?.path as string);
        if (replaced) {
          routeList[index].props.children = replaced;
          toReplace.delete(route?.props?.path as string);
        }
        if (route?.props?.path && routePatches.has(route.props.path as string)) {
          toReplace.set(
            route?.props?.path as string,
            // @ts-ignore
            routeList[index].props.children,
          );
          routePatches.get(route.props.path as string)?.forEach((patch) => {
            const oType = routeList[index].props.children.type;
            routeList[index].props.children = patch({
              ...routeList[index].props,
              children: {
                ...cloneElement(routeList[index].props.children),
                type: routeList[index].props.children[isPatched] ? oType : (props) => createElement(oType, props),
              },
            }).children;
            routeList[index].props.children[isPatched] = true;
          });
        }
      });
    };
    let toReplace = new Map<string, ReactNode>();
    const DeckyWrapper = ({ children }: { children: ReactElement }) => {
      const { routes, routePatches } = useDeckyRouterState();
      const mainRouteList = children.props.children[0].props.children;
      const ingameRouteList = children.props.children[1].props.children; // /appoverlay and /apprunning
      processList(mainRouteList, routes, routePatches, true);
      processList(ingameRouteList, null, routePatches, false);

      this.debug('Rerendered routes list');
      return children;
    };

    let renderedComponents: ReactElement[] = [];

    const DeckyGlobalComponentsWrapper = () => {
      const { components } = useDeckyGlobalComponentsState();
      if (renderedComponents.length != components.size) {
        this.debug('Rerendering global components');
        renderedComponents = Array.from(components.values()).map((GComponent) => <GComponent />);
      }
      return <>{renderedComponents}</>;
    };

    this.wrapperPatch = afterPatch(this.gamepadWrapper, 'render', (_: any, ret: any) => {
      if (ret?.props?.children?.props?.children?.length == 5 || ret?.props?.children?.props?.children?.length == 4) {
        const idx = ret?.props?.children?.props?.children?.length == 4 ? 1 : 2;
        const potentialSettingsRootString =
          ret.props.children.props.children[idx]?.props?.children?.[0]?.type?.type?.toString() || '';
        if (potentialSettingsRootString?.includes('Settings.Root()')) {
          if (!this.router) {
            this.router = ret.props.children.props.children[idx]?.props?.children?.[0]?.type;
            this.routerPatch = afterPatch(this.router, 'type', (_: any, ret: any) => {
              if (!Route)
                Route = ret.props.children[0].props.children.find((x: any) => x.props.path == '/createaccount').type;
              const returnVal = (
                <DeckyRouterStateContextProvider deckyRouterState={this.routerState}>
                  <DeckyWrapper>{ret}</DeckyWrapper>
                </DeckyRouterStateContextProvider>
              );
              return returnVal;
            });
            this.memoizedRouter = memo(this.router.type);
            this.memoizedRouter.isDeckyRouter = true;
          }
          ret.props.children.props.children.push(
            <DeckyGlobalComponentsStateContextProvider deckyGlobalComponentsState={this.globalComponentsState}>
              <DeckyGlobalComponentsWrapper />
            </DeckyGlobalComponentsStateContextProvider>,
          );
          ret.props.children.props.children[idx].props.children[0].type = this.memoizedRouter;
        }
      }
      return ret;
    });
  }

  addRoute(path: string, component: RouterEntry['component'], props: RouterEntry['props'] = {}) {
    this.routerState.addRoute(path, component, props);
  }

  addPatch(path: string, patch: RoutePatch) {
    return this.routerState.addPatch(path, patch);
  }

  addGlobalComponent(name: string, component: FC) {
    this.globalComponentsState.addComponent(name, component);
  }

  removeGlobalComponent(name: string) {
    this.globalComponentsState.removeComponent(name);
  }

  removePatch(path: string, patch: RoutePatch) {
    this.routerState.removePatch(path, patch);
  }

  removeRoute(path: string) {
    this.routerState.removeRoute(path);
  }

  deinit() {
    this.wrapperPatch.unpatch();
    this.routerPatch?.unpatch();
  }
}

export default RouterHook;
