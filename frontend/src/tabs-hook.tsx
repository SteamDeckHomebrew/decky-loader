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
  private qamBrowserViewRenderer?: any;
  private qamEmbeddedRenderer?: any;
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
    this.qamBrowserViewRenderer = Object.values(qamModule).find((e: any) =>
      e?.type?.toString?.()?.includes('QuickAccessMenuBrowserView'),
    );
    this.qamEmbeddedRenderer = Object.values(qamModule).find((e: any) =>
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

    this.qamBrowserViewPatch = this.installBootstrapPatch(this.qamBrowserViewRenderer, patchHandler);
    if (this.qamEmbeddedRenderer) {
      this.qamEmbeddedPatch = this.installBootstrapPatch(this.qamEmbeddedRenderer, patchHandler);
    }

    // Patch already rendered qam
    const root = getReactRoot(document.getElementById('root') as any);
    const qamNode =
      root &&
      findInReactTree(
        root,
        (n: any) =>
          n.elementType == this.qamBrowserViewRenderer ||
          (this.qamEmbeddedRenderer != null && n.elementType == this.qamEmbeddedRenderer),
      ); // need elementType, because type is actually mobx wrapper
    if (qamNode) {
      console.log('patching existing qam');
      const patch =
        qamNode.elementType == this.qamBrowserViewRenderer ? this.qamBrowserViewPatch : this.qamEmbeddedPatch;
      qamNode.type = patch?.patchedFunction;
      if (qamNode?.alternate) {
        qamNode.alternate.type = qamNode.type;
      }
    }
  }

  private installBootstrapPatch(renderer: any, patchHandler: (args: any[], ret: any) => any): Patch {
    let patch: Patch;
    let hasBootstrapped = false;
    patch = afterPatch(renderer, 'type', (args, ret) => {
      if (hasBootstrapped) return ret;
      hasBootstrapped = true;

      const patchedTree = patchHandler(args, ret);

      // createReactTreePatcher has installed the persistent inner patch now. Drop this
      // outer wrapper after the first render so every QAM render does not traverse and
      // mutate the React tree. Existing fibers retain their function type, so restore
      // those after React finishes committing this render as well.
      patch.unpatch();
      this.restoreRendererFiber(renderer, patch);
      queueMicrotask(() => this.restoreRendererFiber(renderer, patch));
      return patchedTree;
    });
    return patch;
  }

  private restoreRendererFiber(renderer?: any, patch?: Patch) {
    if (!renderer || !patch) return;

    const root = getReactRoot(document.getElementById('root') as any);
    const qamNode =
      root &&
      findInReactTree(
        root,
        (n: any) =>
          n.elementType == renderer && (n.type == patch.patchedFunction || n.alternate?.type == patch.patchedFunction),
      );
    if (!qamNode) return;

    if (qamNode.type == patch.patchedFunction) qamNode.type = patch.original;
    if (qamNode.alternate?.type == patch.patchedFunction) qamNode.alternate.type = patch.original;
  }

  deinit() {
    if (this.qamBrowserViewPatch && !this.qamBrowserViewPatch.hasUnpatched) this.qamBrowserViewPatch.unpatch();
    if (this.qamEmbeddedPatch && !this.qamEmbeddedPatch.hasUnpatched) this.qamEmbeddedPatch.unpatch();
    this.restoreRendererFiber(this.qamBrowserViewRenderer, this.qamBrowserViewPatch);
    this.restoreRendererFiber(this.qamEmbeddedRenderer, this.qamEmbeddedPatch);
  }

  add(tab: Tab) {
    this.debug('Adding tab', tab.id, 'to render array');
    this.tabs.push(tab);
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
        tab: icon,
        decky: true,
        initialVisibility: visible,
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
