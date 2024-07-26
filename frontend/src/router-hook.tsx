import { ErrorBoundary, Patch, afterPatch, findInReactTree, getReactRoot, sleep } from '@decky/ui';
import { FC, ReactElement, ReactNode, cloneElement, createElement } from 'react';
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
  private routerState: DeckyRouterState = new DeckyRouterState();
  private globalComponentsState: DeckyGlobalComponentsState = new DeckyGlobalComponentsState();
  private renderedComponents: ReactElement[] = [];
  private Route: any;
  private DeckyWrapper = this.routerWrapper.bind(this);
  private DeckyGlobalComponentsWrapper = this.globalComponentsWrapper.bind(this);
  private toReplace = new Map<string, ReactNode>();
  private routerPatch?: Patch;
  public routes?: any[];

  constructor() {
    super('RouterHook');

    this.log('Initialized');
    window.__ROUTER_HOOK_INSTANCE?.deinit?.();
    window.__ROUTER_HOOK_INSTANCE = this;

    (async () => {
      const root = getReactRoot(document.getElementById('root') as any);
      // TODO be more specific, this is horrible and very very slow
      const findRouterNode = () =>
        findInReactTree(
          root,
          (node) =>
            typeof node?.pendingProps?.loggedIn == 'undefined' && node?.type?.toString().includes('Settings.Root()'),
        );
      let routerNode = findRouterNode();
      while (!routerNode) {
        this.warn('Failed to find Router node, reattempting in 5 seconds.');
        await sleep(5000);
        routerNode = findRouterNode();
      }
      if (routerNode) {
        // Patch the component globally
        this.routerPatch = afterPatch(routerNode.elementType, 'type', this.handleRouterRender.bind(this));
        // Swap out the current instance
        routerNode.type = routerNode.elementType.type;
        if (routerNode?.alternate) {
          routerNode.alternate.type = routerNode.type;
        }
        // Force a full rerender via our custom error boundary
        routerNode?.return?.stateNode?._deckyForceRerender?.();
      }
    })();
  }

  public handleRouterRender(_: any, ret: any) {
    const DeckyWrapper = this.DeckyWrapper;
    const DeckyGlobalComponentsWrapper = this.DeckyGlobalComponentsWrapper;
    if (!this.Route)
      // TODO make more redundant
      this.Route = ret.props.children[0].props.children.find((x: any) => x.props.path == '/createaccount').type;
    if (ret._decky) {
      return ret;
    }
    const returnVal = (
      <>
        <DeckyRouterStateContextProvider deckyRouterState={this.routerState}>
          <DeckyWrapper>{ret}</DeckyWrapper>
        </DeckyRouterStateContextProvider>
        <DeckyGlobalComponentsStateContextProvider deckyGlobalComponentsState={this.globalComponentsState}>
          <DeckyGlobalComponentsWrapper />
        </DeckyGlobalComponentsStateContextProvider>
      </>
    );
    (returnVal as any)._decky = true;
    return returnVal;
  }

  private globalComponentsWrapper() {
    const { components } = useDeckyGlobalComponentsState();
    if (this.renderedComponents.length != components.size) {
      this.debug('Rerendering global components');
      this.renderedComponents = Array.from(components.values()).map((GComponent) => <GComponent />);
    }
    return <>{this.renderedComponents}</>;
  }

  private routerWrapper({ children }: { children: ReactElement }) {
    // Used to store the new replicated routes we create to allow routes to be unpatched.

    const { routes, routePatches } = useDeckyRouterState();
    // TODO make more redundant
    if (!children?.props?.children?.[0]?.props?.children) {
      this.debug('routerWrapper wrong component?', children);
      return children;
    }
    const mainRouteList = children.props.children[0].props.children;
    const ingameRouteList = children.props.children[1].props.children; // /appoverlay and /apprunning
    this.processList(mainRouteList, routes, routePatches, true);
    this.processList(ingameRouteList, null, routePatches, false);

    this.debug('Rerendered routes list');
    return children;
  }

  private processList(
    routeList: any[],
    routes: Map<string, RouterEntry> | null,
    routePatches: Map<string, Set<RoutePatch>>,
    save: boolean,
  ) {
    const Route = this.Route;
    this.debug('Route list: ', routeList);
    if (save) this.routes = routeList;
    let routerIndex = routeList.length;
    if (routes) {
      if (!routeList[routerIndex - 1]?.length || routeList[routerIndex - 1]?.length !== routes.size) {
        if (routeList[routerIndex - 1]?.length && routeList[routerIndex - 1].length !== routes.size) routerIndex--;
        const newRouterArray: (ReactElement | JSX.Element)[] = [];
        routes.forEach(({ component, props }, path) => {
          newRouterArray.push(
            <Route path={path} {...props}>
              <ErrorBoundary>{createElement(component)}</ErrorBoundary>
            </Route>,
          );
        });
        routeList[routerIndex] = newRouterArray;
      }
    }
    routeList.forEach((route: Route, index: number) => {
      const replaced = this.toReplace.get(route?.props?.path as string);
      if (replaced) {
        routeList[index].props.children = replaced;
        this.toReplace.delete(route?.props?.path as string);
      }
      if (route?.props?.path && routePatches.has(route.props.path as string)) {
        this.toReplace.set(
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
    this.routerPatch?.unpatch();
  }
}

export default RouterHook;
