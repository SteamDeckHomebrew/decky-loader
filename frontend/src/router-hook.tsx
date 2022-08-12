import { afterPatch, findModuleChild, unpatch } from 'decky-frontend-lib';
import React, { ReactElement, cloneElement, createElement, memo } from 'react';
import type { Route, RouteProps } from 'react-router';

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

class RouterHook extends Logger {
  private router: any;
  private memoizedRouter: any;
  private gamepadWrapper: any;
  private routerState: DeckyRouterState = new DeckyRouterState();

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
    let toReplace = new Map<string, ReactNode>();
    const DeckyWrapper = ({ children }: { children: ReactElement }) => {
      const { routes, routePatches } = useDeckyRouterState();

      const routeList = children.props.children[0].props.children;

      let routerIndex = routeList.length;
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
                type: (props) => createElement(oType, props),
              },
            }).children;
          });
        }
      });
      this.debug('Rerendered routes list');
      return children;
    };

    afterPatch(this.gamepadWrapper, 'render', (_: any, ret: any) => {
      if (ret?.props?.children?.props?.children?.length == 5) {
        if (
          ret.props.children.props.children[2]?.props?.children?.[0]?.type?.type
            ?.toString()
            ?.includes('GamepadUI.Settings.Root()')
        ) {
          if (!this.router) {
            this.router = ret.props.children.props.children[2]?.props?.children?.[0]?.type;
            afterPatch(this.router, 'type', (_: any, ret: any) => {
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
          ret.props.children.props.children[2].props.children[0].type = this.memoizedRouter;
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

  removePatch(path: string, patch: RoutePatch) {
    this.routerState.removePatch(path, patch);
  }

  removeRoute(path: string) {
    this.routerState.removeRoute(path);
  }

  deinit() {
    unpatch(this.gamepadWrapper, 'render');
    this.router && unpatch(this.router, 'type');
  }
}

export default RouterHook;
