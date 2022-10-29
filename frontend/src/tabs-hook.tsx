import { Patch, QuickAccessTab, afterPatch, findInReactTree, quickAccessMenuClasses, sleep } from 'decky-frontend-lib';

import { QuickAccessVisibleStateProvider } from './components/QuickAccessVisibleState';
import Logger from './logger';

declare global {
  interface Window {
    __TABS_HOOK_INSTANCE: any;
    securitystore: any;
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
  private qAMRoot: any;
  private qamPatch?: Patch;

  constructor() {
    super('TabsHook');

    this.log('Initialized');
    window.__TABS_HOOK_INSTANCE?.deinit?.();
    window.__TABS_HOOK_INSTANCE = this;

    const self = this;
    const tree = (document.getElementById('root') as any)._reactRootContainer._internalRoot.current;
    let qAMRoot: any;
    async function findQAMRoot(currentNode: any, iters: number): Promise<any> {
      if (iters >= 60) {
        // currently 44
        return null;
      }
      if (
        currentNode?.memoizedProps?.ModalManager &&
        currentNode?.type?.toString()?.includes('QuickAccessMenuBrowserView')
      ) {
        self.log(`QAM root was found in ${iters} recursion cycles`);
        return currentNode;
      }
      currentNode = currentNode?.child;
      if (!currentNode) return null;
      if (currentNode.sibling) {
        let node = await findQAMRoot(currentNode.sibling, iters + 1);
        if (node !== null) return node;
      }
      return await findQAMRoot(currentNode, iters + 1);
    }
    (async () => {
      // QAM does not exist until lockscreen is dismissed
      await sleep(1000);
      let waited = !!window.securitystore.GetActiveLockScreenProps();
      while (window.securitystore.GetActiveLockScreenProps()) {
        await sleep(500);
      }
      if (waited) await sleep(1000);
      qAMRoot = await findQAMRoot(tree, 0);
      while (!qAMRoot) {
        this.error(
          'Failed to find QAM root node, reattempting in 5 seconds. A developer may need to increase the recursion limit.',
        );
        await sleep(5000);
        qAMRoot = await findQAMRoot(tree, 0);
      }
      this.log('root', qAMRoot);
      this.qAMRoot = qAMRoot;
      let patchedInnerQAM: any;
      this.qamPatch = afterPatch(qAMRoot, 'type', (_: any, ret: any) => {
        try {
          this.log('qam inner');
          const qamTabsRenderer = findInReactTree(ret, (x) => x?.props?.onFocusNavDeactivated);
          if (patchedInnerQAM) {
            qamTabsRenderer.type = patchedInnerQAM;
          } else {
            afterPatch(qamTabsRenderer, 'type', (innerArgs: any, ret: any) => {
              const tabs = findInReactTree(ret, (x) => x?.props?.tabs);
              this.render(tabs.props.tabs, innerArgs[0].visible);
              return ret;
            });
            patchedInnerQAM = qamTabsRenderer.type;
          }
        } catch (e) {
          this.error('Error patching QAM', e);
        }

        return ret;
      });
      this.log('Finished initial injection');
    })();
  }

  deinit() {
    this.qamPatch?.unpatch();
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
        if (tab?.decky) tab.panel.props.setter[0](visible);
      }
      return;
    }
    for (const { title, icon, content, id } of this.tabs) {
      existingTabs.push({
        key: id,
        title,
        tab: icon,
        decky: true,
        panel: (
          <QuickAccessVisibleStateProvider initial={visible} setter={[]}>
            {content}
          </QuickAccessVisibleStateProvider>
        ),
      });
    }
  }
}

export default TabsHook;
