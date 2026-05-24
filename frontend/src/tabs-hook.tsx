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
  id: QuickAccessTab | number | string;
  title: any;
  content: any;
  icon: any;
}

class TabsHook extends Logger {
  // private keys = 7;
  tabs: Tab[] = [];
  private qamBrowserViewPatch?: Patch;
  private qamEmbeddedPatch?: Patch;

  constructor() {
    super('TabsHook');

    this.log('Initialized');
    window.__TABS_HOOK_INSTANCE?.deinit?.();
    window.__TABS_HOOK_INSTANCE = this;
  }

  init() {
    const qamModule = findModuleByExport((e) => e?.type?.toString?.()?.includes('QuickAccessMenuBrowserView'));
    const qamBrowserViewRenderer = Object.values(qamModule).find((e: any) =>
      e?.type?.toString?.()?.includes('QuickAccessMenuBrowserView'),
    );
    const qamEmbeddedRenderer = Object.values(qamModule).find((e: any) =>
      e?.type?.toString?.()?.includes('QuickAccessMenuEmbedded'),
    );

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
      console.log('patching existing qam');
      // Only affects this fiber node so we don't need to unpatch here
      qamNode.type = qamNode.elementType.type;
      if (qamNode?.alternate) {
        qamNode.alternate.type = qamNode.type;
      }
    }
  }

  deinit() {
    this.qamBrowserViewPatch?.unpatch();
    this.qamEmbeddedPatch?.unpatch();
  }

  add(tab: Tab) {
    this.debug('Adding tab', tab.id, 'to render array');
    this.tabs.push(tab);
  }

  removeById(id: QuickAccessTab | number | string) {
    this.debug('Removing tab', id);
    this.tabs = this.tabs.filter((tab) => tab.id !== id);
  }

  render(existingTabs: any[], visible: boolean) {
    const existing = new Map<unknown, any>();
    for (let i = existingTabs.length - 1; i >= 0; i--) {
      if (existingTabs[i]?.decky) {
        existing.set(existingTabs[i].key, existingTabs[i]);
        existingTabs.splice(i, 1);
      }
    }

    const ordered = [...this.tabs].sort((a, b) => {
      if (a.id === QuickAccessTab.Decky) return 1;
      if (b.id === QuickAccessTab.Decky) return -1;
      return 0;
    });

    for (const { title, icon, content, id } of ordered) {
      let tab = existing.get(id);
      if (tab) {
        if (tab.qAMVisibilitySetter) {
          tab.qAMVisibilitySetter(visible);
        } else {
          tab.initialVisibility = visible;
        }
      } else {
        tab = {
          key: id,
          title,
          tab: icon,
          decky: true,
          initialVisibility: visible,
        };
        tab.panel = (
          <ErrorBoundary>
            <QuickAccessVisibleStateProvider tab={tab}>{content}</QuickAccessVisibleStateProvider>
          </ErrorBoundary>
        );
      }
      existingTabs.push(tab);
    }
  }
}

export default TabsHook;
