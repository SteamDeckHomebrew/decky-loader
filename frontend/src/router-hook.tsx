import {
  ErrorBoundary,
  Patch,
  afterPatch,
  findInReactTree,
  findInTree,
  findModuleByExport,
  getReactRoot,
  injectFCTrampoline,
  sleep,
  wrapReactType,
} from '@decky/ui';
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
import { UIMode } from './enums';
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
  private renderedComponents = new Map<UIMode, ReactElement[]>([
    [UIMode.BigPicture, []],
    [UIMode.Desktop, []],
  ]);
  private Route: any;
  private DesktopRoute: any;
  private wrappedDesktopLibraryMemo?: any;
  private DeckyGamepadRouterWrapper = this.gamepadRouterWrapper.bind(this);
  private DeckyDesktopRouterWrapper = this.desktopRouterWrapper.bind(this);
  private DeckyGlobalComponentsWrapper = this.globalComponentsWrapper.bind(this);
  private toReplace = new Map<string, ReactNode>();
  private desktopRouterPatch?: Patch;
  private gamepadRouterPatch?: Patch;
  private modeChangeRegistration?: any;
  private patchedModes = new Set<number>();
  public routes?: any[];

  constructor() {
    super('RouterHook');

    this.log('Initialized');
    window.__ROUTER_HOOK_INSTANCE?.deinit?.();
    window.__ROUTER_HOOK_INSTANCE = this;

    const reactRouterStackModule = findModuleByExport((e) => e == 'router-backstack', 20);
    if (reactRouterStackModule) {
      this.Route =
        Object.values(reactRouterStackModule).find(
          (e) => typeof e == 'function' && /routePath:.\.match\?\.path./.test(e.toString()),
        ) ||
        Object.values(reactRouterStackModule).find(
          (e) => typeof e == 'function' && /routePath:null===\(.=.\.match\)/.test(e.toString()),
        );
      if (!this.Route) {
        this.error('Failed to find Route component');
      }
    } else {
      this.error('Failed to find router stack module');
    }

    const routerModule = findModuleByExport((e) => e?.displayName == 'Router');
    if (routerModule) {
      this.DesktopRoute = Object.values(routerModule).find(
        (e) =>
          typeof e == 'function' &&
          e?.prototype?.render?.toString()?.includes('props.computedMatch') &&
          e?.prototype?.render?.toString()?.includes('.Children.count('),
      );
      if (!this.DesktopRoute) {
        this.error('Failed to find DesktopRoute component');
      }
    } else {
      this.error('Failed to find router module, desktop routes will not work');
    }

    this.modeChangeRegistration = SteamClient.UI.RegisterForUIModeChanged((mode: UIMode) => {
      this.debug(`UI mode changed to ${mode}`);
      if (this.patchedModes.has(mode)) return;
      this.patchedModes.add(mode);
      this.debug(`Patching router for UI mode ${mode}`);
      switch (mode) {
        case UIMode.BigPicture:
          this.debug('Patching gamepad router');
          this.patchGamepadRouter();
          break;
        // Not fully implemented yet
        case UIMode.Desktop:
          this.debug('Patching desktop router');
          this.patchDesktopRouter();
          break;
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
      this.warn('Failed to find GamepadUI Router node, reattempting in 5 seconds.');
      await sleep(5000);
      await this.waitForUnlock();
      routerNode = findRouterNode();
    }
    if (routerNode) {
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
  }

  private async patchDesktopRouter() {
    const root = getReactRoot(document.getElementById('root') as any);
    const findRouterNode = () =>
      findInReactTree(root, (node) => {
        const typeStr = node?.elementType?.toString?.();
        return (
          typeStr &&
          typeStr?.includes('.IsMainDesktopWindow') &&
          typeStr?.includes('.IN_STEAMUI_SHARED_CONTEXT') &&
          typeStr?.includes('.ContentFrame') &&
          typeStr?.includes('.Console()')
        );
      });
    let routerNode = findRouterNode();
    while (!routerNode) {
      this.warn('Failed to find DesktopUI Router node, reattempting in 5 seconds.');
      await sleep(5000);
      routerNode = findRouterNode();
    }
    if (routerNode) {
      // Patch the component globally
      const patchedRenderer = injectFCTrampoline(routerNode.elementType);
      this.desktopRouterPatch = afterPatch(patchedRenderer, 'component', this.handleDesktopRouterRender.bind(this));
      // Force a full rerender via our custom error boundary
      const errorBoundaryNode = findInTree(routerNode, (e) => e?.stateNode?._deckyForceRerender, {
        walkable: ['return'],
      });
      errorBoundaryNode?.stateNode?._deckyForceRerender?.();
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
          <style>
            {`
              .deckyDesktopDialogPaddingHack + * .DialogContent_InnerWidth {
                max-width: unset !important;
              }
            `}
          </style>
          <div className="deckyDesktopDialogPaddingHack" />
          <DeckyDesktopRouterWrapper>{ret}</DeckyDesktopRouterWrapper>
        </DeckyRouterStateContextProvider>
        <DeckyGlobalComponentsStateContextProvider deckyGlobalComponentsState={this.globalComponentsState}>
          <DeckyGlobalComponentsWrapper uiMode={UIMode.Desktop} />
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
          <DeckyGlobalComponentsWrapper uiMode={UIMode.BigPicture} />
        </DeckyGlobalComponentsStateContextProvider>
      </>
    );
    (returnVal as any)._decky = true;
    return returnVal;
  }

  private globalComponentsWrapper({ uiMode }: { uiMode: UIMode }) {
    const { components } = useDeckyGlobalComponentsState();
    const componentsForMode = components.get(uiMode);
    if (!componentsForMode) {
      this.warn(`Couldn't find global components map for uimode ${uiMode}`);
      return null;
    }
    if (!this.renderedComponents.has(uiMode) || this.renderedComponents.get(uiMode)?.length != componentsForMode.size) {
      this.debug('Rerendering global components for uiMode', uiMode);
      this.renderedComponents.set(
        uiMode,
        Array.from(componentsForMode.values()).map((GComponent) => <GComponent />),
      );
    }
    return <>{this.renderedComponents.get(uiMode)}</>;
  }

  private gamepadRouterWrapper({ children }: { children: ReactElement }) {
    // Used to store the new replicated routes we create to allow routes to be unpatched.

    const { routes, routePatches } = useDeckyRouterState();
    // TODO make more redundant
    if (!children?.props?.children?.[0]?.props?.children) {
      this.debug('routerWrapper wrong component?', children);
      return children;
    }
    const mainRouteList = children.props.children[0].props.children;
    const ingameRouteList = children.props.children[1].props.children; // /appoverlay and /apprunning
    this.processList(mainRouteList, routes, routePatches.get(UIMode.BigPicture), true, this.Route);
    this.processList(ingameRouteList, null, routePatches.get(UIMode.BigPicture), false, this.Route);

    this.debug('Rerendered gamepadui routes list');
    return children;
  }

  private desktopRouterWrapper({ children }: { children: ReactElement }) {
    // Used to store the new replicated routes we create to allow routes to be unpatched.
    const { routes, routePatches } = useDeckyRouterState();
    const mainRouteList = findInReactTree(
      children,
      (node) => node?.length > 2 && node?.find((elem: any) => elem?.props?.path == '/console'),
    );
    if (!mainRouteList) {
      this.debug('routerWrapper wrong component?', children);
      return children;
    }
    this.processList(mainRouteList, routes, routePatches.get(UIMode.Desktop), true, this.DesktopRoute);
    const libraryRouteWrapper = mainRouteList.find(
      (r: any) => r?.props && 'cm' in r.props && 'bShowDesktopUIContent' in r.props,
    );
    if (!this.wrappedDesktopLibraryMemo) {
      wrapReactType(libraryRouteWrapper);
      afterPatch(libraryRouteWrapper.type, 'type', (_, ret) => {
        const { routePatches } = useDeckyRouterState();
        const libraryRouteList = findInReactTree(
          ret,
          (node) => node?.length > 1 && node?.find((elem: any) => elem?.props?.path == '/library/downloads'),
        );
        if (!libraryRouteList) {
          this.warn('failed to find library route list', ret);
          return ret;
        }
        this.processList(libraryRouteList, null, routePatches.get(UIMode.Desktop), false, this.DesktopRoute);
        return ret;
      });
      this.wrappedDesktopLibraryMemo = libraryRouteWrapper.type;
    } else {
      libraryRouteWrapper.type = this.wrappedDesktopLibraryMemo;
    }

    this.debug('Rerendered desktop routes list');
    return children;
  }

  private processList(
    routeList: any[],
    routes: Map<string, RouterEntry> | null | undefined,
    routePatches: Map<string, Set<RoutePatch>> | null | undefined,
    save: boolean,
    RouteComponent: any,
  ) {
    this.debug('Route list: ', routeList);
    if (save) this.routes = routeList;
    let routerIndex = routeList.length;
    if (routes) {
      if (!routeList[routerIndex - 1]?.length || routeList[routerIndex - 1]?.length !== routes.size) {
        if (routeList[routerIndex - 1]?.length && routeList[routerIndex - 1].length !== routes.size) routerIndex--;
        const newRouterArray: (ReactElement | JSX.Element)[] = [];
        routes.forEach(({ component, props }, path) => {
          newRouterArray.push(
            <RouteComponent path={path} {...props}>
              <ErrorBoundary>{createElement(component)}</ErrorBoundary>
            </RouteComponent>,
          );
        });
        routeList[routerIndex] = newRouterArray;
      }
    }
    routePatches &&
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

  addPatch(path: string, patch: RoutePatch, uiMode: UIMode = UIMode.BigPicture) {
    return this.routerState.addPatch(path, patch, uiMode);
  }

  addGlobalComponent(name: string, component: FC, uiMode: UIMode = UIMode.BigPicture) {
    this.globalComponentsState.addComponent(name, component, uiMode);
  }

  removeGlobalComponent(name: string, uiMode: UIMode = UIMode.BigPicture) {
    this.globalComponentsState.removeComponent(name, uiMode);
  }

  removePatch(path: string, patch: RoutePatch, uiMode: UIMode = UIMode.BigPicture) {
    this.routerState.removePatch(path, patch, uiMode);
  }

  removeRoute(path: string) {
    this.routerState.removeRoute(path);
  }

  deinit() {
    this.modeChangeRegistration?.unregister();
    this.gamepadRouterPatch?.unpatch();
    this.desktopRouterPatch?.unpatch();
  }
}

export default RouterHook;
