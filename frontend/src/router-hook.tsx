import { afterPatch, findModuleChild, unpatch } from 'decky-frontend-lib';
import { ReactElement, createElement, memo } from 'react';
import type { Route } from 'react-router';

import {
  DeckyRouterState,
  DeckyRouterStateContextProvider,
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
    const DeckyWrapper = ({ children }: { children: ReactElement }) => {
      const { routes } = useDeckyRouterState();

      const routerIndex = children.props.children[0].props.children.length - 1;
      if (
        !children.props.children[0].props.children[routerIndex].length ||
        children.props.children[0].props.children !== routes.size
      ) {
        const newRouterArray: ReactElement[] = [];
        routes.forEach(({ component, props }, path) => {
          newRouterArray.push(
            <Route path={path} {...props}>
              {createElement(component)}
            </Route>,
          );
        });
        children.props.children[0].props.children[routerIndex] = newRouterArray;
      }
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

  removeRoute(path: string) {
    this.routerState.removeRoute(path);
  }

  deinit() {
    unpatch(this.gamepadWrapper, 'render');
    this.router && unpatch(this.router, 'type');
  }
}

export default RouterHook;
