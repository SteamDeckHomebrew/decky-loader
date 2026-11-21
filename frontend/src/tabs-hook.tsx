// TabsHook for versions after the Desktop merge
import {
  ErrorBoundary,
  Patch,
  QuickAccessTab,
  afterPatch,
  createReactTreePatcher,
  findInReactTree,
  findModuleByExport,
  getReactRoot,
} from '@decky/ui';

import { QuickAccessVisibleStateProvider } from './components/QuickAccessVisibleState';
import Logger from './logger';

declare global {
  interface Window {
    __TABS_HOOK_INSTANCE: any;
  }
}

interface Tab {
  id: QuickAccessTab | number;
  title: any;
  content: any;
  icon: any;
}

class TabsHook extends Logger {
  // private keys = 7;
  tabs: Tab[] = [];
  private qamBrowserViewPatch?: Patch;
  private qamEmbeddedPatch?: Patch;
  private openMenuPatch?: Patch;
  private closeMenuPatch?: Patch;
  private toggleMenuPatch?: Patch;
  private injectTabsRetry?: number;
  private qamTabs?: any[];

  constructor() {
    super('TabsHook');

    this.log('Initialized');
    window.__TABS_HOOK_INSTANCE?.deinit?.();
    window.__TABS_HOOK_INSTANCE = this;
  }

  init() {
    const qamModule = findModuleByExport((e) => e?.type?.toString?.()?.includes('QuickAccessMenuBrowserView'));
    const qamBrowserViewRenderer = qamModule
      ? Object.values(qamModule).find((e: any) => e?.type?.toString?.()?.includes('QuickAccessMenuBrowserView'))
      : undefined;

    if (qamBrowserViewRenderer) {
      this.patchQamModule(qamBrowserViewRenderer);
      return;
    }

    // Vite build: inject into the QAM tab array.
    this.injectTabsFromTree(0);
    this.guardInGameMenuOpen();
  }

  /** The in-game QAM view cannot show the Decky panel while opening. */
  private guardInGameMenuOpen() {
    const menuStore = window.SteamUIStore?.WindowStore?.SteamUIWindows?.[0]?.m_MenuStore;
    if (!menuStore) return;
    const proto = Object.getPrototypeOf(menuStore);
    const inGame = () => window.location.pathname.startsWith('/routes/apprunning');
    const tab = () => menuStore.GetQuickAccessTab?.();
    let wantDecky = false;

    const park = () => {
      if (!inGame()) return;
      wantDecky = tab() === QuickAccessTab.Decky;
      if (wantDecky) menuStore.SetQuickAccessTab?.(QuickAccessTab.Notifications);
    };
    const restore = () => {
      if (wantDecky && inGame()) menuStore.SetQuickAccessTab?.(QuickAccessTab.Decky);
    };

    if (inGame() && !menuStore.GetOpenSideMenu?.() && tab() === QuickAccessTab.Decky) {
      wantDecky = true;
      menuStore.SetQuickAccessTab?.(QuickAccessTab.Notifications);
    }

    this.openMenuPatch = afterPatch(proto, 'OpenQuickAccessMenu', restore);
    this.toggleMenuPatch = afterPatch(proto, 'ToggleSideMenu', () => {
      if (menuStore.GetOpenSideMenu?.()) restore();
    });
    this.closeMenuPatch = afterPatch(proto, 'CloseSideMenus', park);
  }

  private patchQamModule(qamBrowserViewRenderer: any) {
    const qamEmbeddedRenderer = Object.values(
      findModuleByExport((e) => e?.type?.toString?.()?.includes('QuickAccessMenuBrowserView')) ?? {},
    ).find((e: any) => e?.type?.toString?.()?.includes('QuickAccessMenuEmbedded'));

    const patchHandler = createReactTreePatcher(
      [(tree) => findInReactTree(tree, (node) => node?.props?.onFocusNavDeactivated)],
      (args, ret) => {
        const tabs = findInReactTree(ret, (x) => x?.props?.tabs);
        this.render(tabs.props.tabs, args[0].visible);
        return ret;
      },
      'TabsHook',
    );

    this.qamBrowserViewPatch = afterPatch(qamBrowserViewRenderer, 'type', patchHandler);
    if (qamEmbeddedRenderer) this.qamEmbeddedPatch = afterPatch(qamEmbeddedRenderer, 'type', patchHandler);

    // Patch already rendered qam
    const root = getReactRoot(document.getElementById('root') as any);
    const qamNode =
      root &&
      findInReactTree(
        root,
        (n: any) =>
          n.elementType == qamBrowserViewRenderer ||
          (qamEmbeddedRenderer != null && n.elementType == qamEmbeddedRenderer),
      ); // need elementType, because type is actually mobx wrapper
    if (qamNode) {
      // Only affects this fiber node so we don't need to unpatch here
      qamNode.type = qamNode.elementType.type;
      if (qamNode?.alternate) {
        qamNode.alternate.type = qamNode.type;
      }
    }
  }

  private injectTabsFromTree(attempt: number) {
    const root = getReactRoot(document.getElementById('root') as any);
    if (root) {
      const tabsNode = findInReactTree(
        root,
        (node: any) => Array.isArray(node?.memoizedProps?.tabs) && node.memoizedProps.tabs.length > 0,
      );
      if (tabsNode) {
        this.qamTabs = tabsNode.memoizedProps.tabs;
        this.render(this.qamTabs, true);
        this.debug('Injected tab into Quick Access Menu');
        return;
      }
    }

    if (attempt >= 10) {
      this.warn('Could not find Quick Access Menu tabs');
      return;
    }
    this.injectTabsRetry = window.setTimeout(() => this.injectTabsFromTree(attempt + 1), 1000);
  }

  deinit() {
    this.qamBrowserViewPatch?.unpatch();
    this.qamEmbeddedPatch?.unpatch();
    this.openMenuPatch?.unpatch();
    this.toggleMenuPatch?.unpatch();
    this.closeMenuPatch?.unpatch();
    if (this.injectTabsRetry) window.clearTimeout(this.injectTabsRetry);
  }

  add(tab: Tab) {
    this.debug('Adding tab', tab.id, 'to render array');
    this.tabs.push(tab);
    if (this.qamTabs) this.render(this.qamTabs, true);
  }

  removeById(id: number) {
    this.debug('Removing tab', id);
    this.tabs = this.tabs.filter((tab) => tab.id !== id);
  }

  render(existingTabs: any[], visible: boolean) {
    let deckyTabAmount = existingTabs.reduce((prev: any, cur: any) => (cur.decky ? prev + 1 : prev), 0);
    if (deckyTabAmount == this.tabs.length) {
      for (let tab of existingTabs) {
        if (tab?.decky) {
          if (tab?.qAMVisibilitySetter) {
            tab?.qAMVisibilitySetter(visible);
          } else {
            tab.initialVisibility = visible;
          }
        }
      }
      return;
    }
    for (const { title, icon, content, id } of this.tabs) {
      const tab: any = {
        key: id,
        title,
        strTitle: 'Decky',
        tab: icon,
        decky: true,
        initialVisibility: visible,
        vrLocation: 'quick-access-menu',
      };
      tab.panel = (
        <ErrorBoundary>
          <QuickAccessVisibleStateProvider tab={tab}>{content}</QuickAccessVisibleStateProvider>
        </ErrorBoundary>
      );
      existingTabs.push(tab);
    }
  }
}

export default TabsHook;
