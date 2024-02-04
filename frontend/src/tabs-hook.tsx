// TabsHook for versions after the Desktop merge
import { Patch, QuickAccessTab, afterPatch, findInReactTree, getReactRoot, sleep } from 'decky-frontend-lib';

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
  private qAMRoot?: any;
  private qamPatch?: Patch;

  constructor() {
    super('TabsHook');

    this.log('Initialized');
    window.__TABS_HOOK_INSTANCE?.deinit?.();
    window.__TABS_HOOK_INSTANCE = this;
  }

  init() {
    const tree = getReactRoot(document.getElementById('root') as any);
    let qAMRoot: any;
    const findQAMRoot = (currentNode: any, iters: number): any => {
      if (iters >= 80) {
        // currently 67
        return null;
      }
      if (
        typeof currentNode?.memoizedProps?.visible == 'boolean' &&
        currentNode?.type?.toString()?.includes('QuickAccessMenuBrowserView')
      ) {
        this.log(`QAM root was found in ${iters} recursion cycles`);
        return currentNode;
      }
      if (currentNode.child) {
        let node = findQAMRoot(currentNode.child, iters + 1);
        if (node !== null) return node;
      }
      if (currentNode.sibling) {
        let node = findQAMRoot(currentNode.sibling, iters + 1);
        if (node !== null) return node;
      }
      return null;
    };
    (async () => {
      qAMRoot = findQAMRoot(tree, 0);
      while (!qAMRoot) {
        this.error(
          'Failed to find QAM root node, reattempting in 5 seconds. A developer may need to increase the recursion limit.',
        );
        await sleep(5000);
        qAMRoot = findQAMRoot(tree, 0);
      }
      this.qAMRoot = qAMRoot;
      let patchedInnerQAM: any;
      this.qamPatch = afterPatch(qAMRoot.return, 'type', (_: any, ret: any) => {
        try {
          if (!qAMRoot?.child) {
            qAMRoot = findQAMRoot(tree, 0);
            this.qAMRoot = qAMRoot;
          }
          if (qAMRoot?.child && !qAMRoot?.child?.type?.decky) {
            afterPatch(qAMRoot.child, 'type', (_: any, ret: any) => {
              try {
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
                this.error('Error patching QAM inner', e);
              }
              return ret;
            });
            qAMRoot.child.type.decky = true;
            qAMRoot.child.alternate.type = qAMRoot.child.type;
          }
        } catch (e) {
          this.error('Error patching QAM', e);
        }

        return ret;
      });

      if (qAMRoot.return.alternate) {
        qAMRoot.return.alternate.type = qAMRoot.return.type;
      }
      this.log('Finished initial injection');
    })();
  }

  deinit() {
    this.qamPatch?.unpatch();
    this.qAMRoot.return.alternate.type = this.qAMRoot.return.type;
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
      tab.panel = <QuickAccessVisibleStateProvider tab={tab}>{content}</QuickAccessVisibleStateProvider>;
      existingTabs.push(tab);
    }
  }
}

export default TabsHook;
