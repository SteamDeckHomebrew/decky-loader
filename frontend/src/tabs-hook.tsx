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
  private qamPatch?: Patch;

  constructor() {
    super('TabsHook');

    this.log('Initialized');
    window.__TABS_HOOK_INSTANCE?.deinit?.();
    window.__TABS_HOOK_INSTANCE = this;
  }

  init() {
    // TODO patch the "embedded" renderer in this module too (seems to be for VR? unsure)
    const qamModule = findModuleByExport((e) => e?.type?.toString()?.includes('QuickAccessMenuBrowserView'));
    const qamRenderer = Object.values(qamModule).find((e: any) =>
      e?.type?.toString()?.includes('QuickAccessMenuBrowserView'),
    );

    const patchHandler = createReactTreePatcher(
      [(tree) => findInReactTree(tree, (node) => node?.props?.onFocusNavDeactivated)],
      (args, ret) => {
        this.log('qam render', args, ret);
        const tabs = findInReactTree(ret, (x) => x?.props?.tabs);
        this.render(tabs.props.tabs, args[0].visible);
        return ret;
      },
      'TabsHook',
    );

    this.qamPatch = afterPatch(qamRenderer, 'type', patchHandler);

    // Patch already rendered qam
    const root = getReactRoot(document.getElementById('root') as any);
    const qamNode = root && findInReactTree(root, (n: any) => n.elementType == qamRenderer); // need elementType, because type is actually mobx wrapper
    if (qamNode) {
      this.debug('qamNode', qamNode);
      // Only affects this fiber node so we don't need to unpatch here
      qamNode.type = qamNode.elementType.type;
      if (qamNode?.alternate) {
        qamNode.alternate.type = qamNode.type;
      }
    }
  }

  deinit() {
    this.qamPatch?.unpatch();
    // this.qAMRoot.return.alternate.type = this.qAMRoot.return.type;
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
