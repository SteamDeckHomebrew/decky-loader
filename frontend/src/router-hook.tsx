import { afterPatch, findModuleChild, unpatch } from 'decky-frontend-lib';
import { FC, ReactElement, createElement } from 'react';

import { DeckyRouterState, DeckyRouterStateContextProvider, useDeckyRouterState } from './components/DeckyRouterState';
import Logger from './logger';

declare global {
  interface Window {
    __ROUTER_HOOK_INSTANCE: any;
  }
}

interface RouteProps {
  path: string;
  children: ReactElement;
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

    let Route: FC<RouteProps>;
    const DeckyWrapper = ({ children }: { children: ReactElement }) => {
      const { routes } = useDeckyRouterState();
      console.log(children.props.children[0].props.children, routes);
      const routerIndex = children.props.children[0].props.children.length - 1;
      if (
        !children.props.children[0].props.children[routerIndex].length ||
        children.props.children[0].props.children !== routes.size
      ) {
        const newRouterArray: ReactElement[] = [];
        routes.forEach((Render, path) => {
          newRouterArray.push(<Route path={path}>{createElement(Render)}</Route>);
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
            this.memoizedRouter = window.SP_REACT.memo(this.router.type);
            this.memoizedRouter.isDeckyRouter = true;
          }
          ret.props.children.props.children[2].props.children[0].type = this.memoizedRouter;
        }
      }
      return ret;
    });
  }

  deinit() {
    unpatch(this.gamepadWrapper, 'render');
    this.router && unpatch(this.router, 'type');
  }
}

export default RouterHook;
