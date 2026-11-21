import {
  EUIMode,
  ErrorBoundary,
  Patch,
  afterPatch,
  findInReactTree,
  findInTree,
  findModuleByExport,
  getReactRoot,
  sleep,
} from '@decky/ui';
import { FC, JSX, ReactElement, ReactNode, cloneElement, createElement } from 'react';
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

// Matches Steam's page surface.
const deckyRouteStyle = {
  position: 'absolute' as const,
  inset: 0,
  background: '#0e141b',
  overflow: 'hidden' as const,
};

class RouterHook extends Logger {
  private routerState: DeckyRouterState = new DeckyRouterState();
  private globalComponentsState: DeckyGlobalComponentsState = new DeckyGlobalComponentsState();
  private renderedComponents: ReactElement<any>[] = [];
  private Route: any;
  private DeckyGamepadRouterWrapper = this.gamepadRouterWrapper.bind(this);
  private DeckyDesktopRouterWrapper = this.desktopRouterWrapper.bind(this);
  private DeckyGlobalComponentsWrapper = this.globalComponentsWrapper.bind(this);
  private toReplace = new Map<string, ReactNode>();
  private desktopRouterPatch?: Patch;
  private gamepadRouterPatch?: Patch;
  private modeChangeRegistration?: any;
  private patchedModes = new Set<number>();
  public routes?: any[];
  private history?: any;
  private lastNonDeckyRoute?: string;
  private routeWatchTimer?: number;
  private viteRouteType?: any;
  private viteRouteElement?: any;

  constructor() {
    super('RouterHook');

    this.log('Initialized');
    window.__ROUTER_HOOK_INSTANCE?.deinit?.();
    window.__ROUTER_HOOK_INSTANCE = this;

    const reactRouterStackModule = findModuleByExport((e) => typeof e == 'string' && e == 'router-backstack', 20);
    if (reactRouterStackModule) {
      this.Route =
        Object.values(reactRouterStackModule).find(
          (e) => typeof e == 'function' && /routePath:[\w$]+\.match\?\.path./.test(e.toString()),
        ) ||
        Object.values(reactRouterStackModule).find(
          (e) => typeof e == 'function' && /routePath:null===\(.=.\.match\)/.test(e.toString()),
        );
      if (!this.Route) {
        this.error('Failed to find Route component');
      }
    } else {
      this.debug('No router stack module (Vite build)');
    }

    // Vite build: take Route from the rendered tree.
    if (!this.Route) {
      const root = getReactRoot(document.getElementById('root') as any);
      const routeNode = root && findInReactTree(root, (node) => /routePath:[\w$]+\.match\?\.path/.test(String(node?.type)));
      this.Route = routeNode?.type;
      if (!this.Route) {
        this.warn('Router patching is unavailable in this SteamUI version');
        return;
      }
    }

    this.modeChangeRegistration = SteamClient.UI.RegisterForUIModeChanged((mode: EUIMode) => {
      this.debug(`UI mode changed to ${mode}`);
      // The UI is recreated on mode switches.
      if (!window.webpackChunksteamui) {
        if (mode === EUIMode.GamePad) this.patchGamepadRouter();
        return;
      }
      if (this.patchedModes.has(mode)) return;
      this.patchedModes.add(mode);
      this.debug(`Patching router for UI mode ${mode}`);
      switch (mode) {
        case EUIMode.GamePad:
          this.debug('Patching gamepad router');
          this.patchGamepadRouter();
          break;
        // Not fully implemented yet
        // case UIMode.Desktop:
        //   this.debug("Patching desktop router");
        //   this.patchDesktopRouter();
        //   break;
        default:
          this.warn(`Router patch not implemented for UI mode ${mode}`);
          break;
      }
    });
  }

  private async patchGamepadRouter() {
    const root = getReactRoot(document.getElementById('root') as any);
    const findRouterNode = () =>
      findInReactTree(
        root,
        (node) =>
          typeof node?.pendingProps?.loggedIn == 'undefined' && node?.type?.toString().includes('Settings.Root()'),
      );
    await this.waitForUnlock();
    let routerNode = findRouterNode();
    while (!routerNode) {
      this.warn('Failed to find Router node, reattempting in 5 seconds.');
      await sleep(5000);
      await this.waitForUnlock();
      routerNode = findRouterNode();
    }
    if (!routerNode) return;

    if (!window.webpackChunksteamui) {
      this.patchViteRouter(routerNode);
      return;
    }

    // Patch the component globally
    this.gamepadRouterPatch = afterPatch(routerNode.elementType, 'type', this.handleGamepadRouterRender.bind(this));
    // Swap out the current instance
    routerNode.type = routerNode.elementType.type;
    if (routerNode?.alternate) {
      routerNode.alternate.type = routerNode.type;
    }
    // Force a full rerender via our custom error boundary
    const errorBoundaryNode = findInTree(routerNode, (e) => e?.stateNode?._deckyForceRerender, {
      walkable: ['return'],
    });
    errorBoundaryNode?.stateNode?._deckyForceRerender?.();
  }

  /** Vite build: mount Decky routes through Steam's <Switch>. */
  private patchViteRouter(routerNode: any) {
    const stack = [routerNode];
    let switchProps: any;
    let routeType: any;
    while (stack.length && !switchProps) {
      const fiber = stack.pop();
      const props = fiber?.stateNode?.props;
      const children = props?.children;
      if (Array.isArray(children) && children.some((child: any) => child?.props?.path)) {
        switchProps = props;
        routeType = children.find((child: any) => child?.props?.path)?.type;
      }
      const contextValue = fiber?.memoizedProps?.value;
      if (!this.history && contextValue?.history && contextValue?.location) {
        this.history = contextValue.history;
      }
      if (fiber?.sibling) stack.push(fiber.sibling);
      if (fiber?.child) stack.push(fiber.child);
    }
    if (!switchProps || !routeType) {
      this.warn('Failed to find the route switch to hook into');
      return;
    }
    if (switchProps.children.includes(this.viteRouteElement)) return;

    this.viteRouteType = routeType;
    this.viteRouteElement = createElement(routeType, {
      path: this.viteRoutePaths(),
      children: () => (
        <DeckyRouterStateContextProvider deckyRouterState={this.routerState}>
          <DeckyGlobalComponentsStateContextProvider deckyGlobalComponentsState={this.globalComponentsState}>
            <this.DeckyRouteHost />
          </DeckyGlobalComponentsStateContextProvider>
        </DeckyRouterStateContextProvider>
      ),
    });
    switchProps.children = [...switchProps.children, this.viteRouteElement];
    this.watchDeckyRouteLifetime();
    this.debug('Added Decky route to the Steam route switch');
  }

  /** Drop stale Decky routes when the side menu closes. */
  private watchDeckyRouteLifetime() {
    if (this.routeWatchTimer) window.clearInterval(this.routeWatchTimer);
    const history = this.history;
    if (!history) return;
    if (this.lastNonDeckyRoute === undefined) {
      this.lastNonDeckyRoute = history.location?.pathname;
    }
    history.listen?.((location: any) => {
      if (!location.pathname.startsWith('/decky')) this.lastNonDeckyRoute = location.pathname;
    });

    const menuStore = window.SteamUIStore?.WindowStore?.SteamUIWindows?.[0]?.m_MenuStore;
    if (!menuStore) return;
    let wasOpen = false;
    let routeAtOpen = '';
    this.routeWatchTimer = window.setInterval(() => {
      const open = !!menuStore.GetOpenSideMenu?.();
      const pathname: string = history.location?.pathname ?? '';
      if (open && !wasOpen) routeAtOpen = pathname;
      // Ignore routes Decky navigated to while the menu was open.
      if (wasOpen && !open && pathname.startsWith('/decky') && pathname === routeAtOpen) {
        history.replace(this.lastNonDeckyRoute && !this.lastNonDeckyRoute.startsWith('/decky') ? this.lastNonDeckyRoute : '/library/home');
      }
      wasOpen = open;
    }, 500);
  }

  private viteRoutePaths(): string[] {
    const paths = [...this.routerState.publicState().routes.keys()];
    return ['/decky', ...paths.filter((path) => path !== '/decky')];
  }

  private syncViteRoutes() {
    if (!this.viteRouteElement) return;
    this.viteRouteElement.props.path = this.viteRoutePaths();
    const history = this.history;
    if (history?.location) history.replace(history.location);
  }

  private DeckyRouteHost = () => {
    const { routes } = useDeckyRouterState();
    const pathname = this.history?.location?.pathname ?? window.location.pathname;
    let matchedPath = '';
    let matchedRoute: RouterEntry | undefined;
    for (const [path, entry] of routes) {
      const pattern = new RegExp(`^${path.replace(/\/:[^/]+/g, '/[^/]+').replace(/\*/g, '.*')}/?$`);
      if (pattern.test(pathname) && path.length > matchedPath.length) {
        matchedPath = path;
        matchedRoute = entry;
      }
    }
    return (
      <>
        <style>{`
          .decky-route .DialogContent {
            /* Steam's header overlays the page. */
            padding-top: 48px;
            padding-bottom: 24px;
            overflow-y: auto;
          }
          .decky-route .DialogBody::after {
            content: '';
            display: block;
            height: 72px;
          }
          .decky-route .DialogInput_Wrapper,
          .decky-route .DialogInput {
            width: 100%;
            box-sizing: border-box;
          }
        `}</style>
        {matchedRoute && (
          <div className="decky-route" style={deckyRouteStyle}>
            <ErrorBoundary>{createElement(matchedRoute.component, matchedRoute.props)}</ErrorBoundary>
          </div>
        )}
        <this.DeckyGlobalComponentsWrapper />
      </>
    );
  };

  // Currently unused
  // @ts-expect-error 6133
  private async patchDesktopRouter() {
    const root = getReactRoot(document.getElementById('root') as any);
    const findRouterNode = () =>
      findInReactTree(root, (node) => node?.elementType?.type?.toString?.()?.includes('bShowDesktopUIContent:'));
    let routerNode = findRouterNode();
    while (!routerNode) {
      this.warn('Failed to find Router node, reattempting in 5 seconds.');
      await sleep(5000);
      routerNode = findRouterNode();
    }
    if (routerNode) {
      // this.debug("desktop router node", routerNode);
      // Patch the component globally
      this.desktopRouterPatch = afterPatch(routerNode.elementType, 'type', this.handleDesktopRouterRender.bind(this));
      // Swap out the current instance
      routerNode.type = routerNode.elementType.type;
      if (routerNode?.alternate) {
        routerNode.alternate.type = routerNode.type;
      }
      // Force a full rerender via our custom error boundary
      const errorBoundaryNode = findInTree(routerNode, (e) => e?.stateNode?._deckyForceRerender, {
        walkable: ['return'],
      });
      errorBoundaryNode?.stateNode?._deckyForceRerender?.();
      // this.debug("desktop router node", routerNode);
      // // Patch the component globally
      // this.desktopRouterPatch = afterPatch(routerNode.type.prototype, 'render', this.handleDesktopRouterRender.bind(this));
      // const stateNodeClone = { render: routerNode.stateNode.render } as any;
      // // Patch the current instance. render is readonly so we have to do this.
      // Object.assign(stateNodeClone, routerNode.stateNode);
      // Object.setPrototypeOf(stateNodeClone, Object.getPrototypeOf(routerNode.stateNode));
      // this.desktopRouterFirstInstancePatch = afterPatch(stateNodeClone, 'render', this.handleDesktopRouterRender.bind(this));
      // routerNode.stateNode = stateNodeClone;
      // // Swap out the current instance
      // if (routerNode?.alternate) {
      //   routerNode.alternate.type = routerNode.type;
      //   routerNode.alternate.stateNode = routerNode.stateNode;
      // }
      // routerNode.stateNode.forceUpdate();
      // Force a full rerender via our custom error boundary
      // const errorBoundaryNode = findInTree(routerNode, e => e?.stateNode?._deckyForceRerender, { walkable: ["return"] });
      // errorBoundaryNode?.stateNode?._deckyForceRerender?.();
    }
  }

  public async waitForUnlock() {
    try {
      while (window?.securitystore?.IsLockScreenActive?.()) {
        await sleep(500);
      }
    } catch (e) {
      this.warn('Error while checking if unlocked:', e);
    }
  }

  public handleDesktopRouterRender(_: any, ret: any) {
    const DeckyDesktopRouterWrapper = this.DeckyDesktopRouterWrapper;
    const DeckyGlobalComponentsWrapper = this.DeckyGlobalComponentsWrapper;
    this.debug('desktop router render', ret);
    if (ret._decky) {
      return ret;
    }
    const returnVal = (
      <>
        <DeckyRouterStateContextProvider deckyRouterState={this.routerState}>
          <DeckyDesktopRouterWrapper>{ret}</DeckyDesktopRouterWrapper>
        </DeckyRouterStateContextProvider>
        <DeckyGlobalComponentsStateContextProvider deckyGlobalComponentsState={this.globalComponentsState}>
          <DeckyGlobalComponentsWrapper />
        </DeckyGlobalComponentsStateContextProvider>
      </>
    );
    (returnVal as any)._decky = true;
    return returnVal;
  }

  public handleGamepadRouterRender(_: any, ret: any) {
    const DeckyGamepadRouterWrapper = this.DeckyGamepadRouterWrapper;
    const DeckyGlobalComponentsWrapper = this.DeckyGlobalComponentsWrapper;
    if (ret._decky) {
      return ret;
    }
    const returnVal = (
      <>
        <DeckyRouterStateContextProvider deckyRouterState={this.routerState}>
          <DeckyGamepadRouterWrapper>{ret}</DeckyGamepadRouterWrapper>
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

  private gamepadRouterWrapper({ children }: { children: ReactElement<any> }) {
    // Used to store the new replicated routes we create to allow routes to be unpatched.
    const { routes, routePatches } = useDeckyRouterState();
    // Find the array that holds the route elements.
    const routeList = findInReactTree(
      children,
      (node: any) => Array.isArray(node) && node.some((child: any) => child?.props?.path),
    );
    if (!routeList) {
      this.debug('routerWrapper wrong component?', children);
      return children;
    }
    this.processList(routeList, routes, routePatches, true);

    this.debug('Rerendered gamepadui routes list');
    return children;
  }

  private desktopRouterWrapper({ children }: { children: ReactElement<any> }) {
    // Used to store the new replicated routes we create to allow routes to be unpatched.
    this.debug('desktop router wrapper render', children);
    const { routes, routePatches } = useDeckyRouterState();
    const routeList = findInReactTree(
      children,
      (node) => node?.length > 2 && node?.find((elem: any) => elem?.props?.path == '/library/home'),
    );
    if (!routeList) {
      this.debug('routerWrapper wrong component?', children);
      return children;
    }
    const library = children.props.children[1].props.children.props;
    if (!Array.isArray(library.children)) {
      library.children = [library.children];
    }
    this.debug('library', library);
    this.processList(library.children, routes, routePatches, true);

    this.debug('Rerendered desktop routes list');
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
        const newRouterArray: (ReactElement<any> | JSX.Element)[] = [];
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
    this.syncViteRoutes();
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
    this.syncViteRoutes();
  }

  deinit() {
    this.modeChangeRegistration?.unregister();
    if (this.routeWatchTimer) window.clearInterval(this.routeWatchTimer);
    this.gamepadRouterPatch?.unpatch();
    this.desktopRouterPatch?.unpatch();
  }
}

export default RouterHook;
