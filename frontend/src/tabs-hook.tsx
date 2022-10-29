import { Patch, QuickAccessTab, afterPatch, findInReactTree, sleep } from 'decky-frontend-lib';

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
  private qAMRoot?: any;
  private qamPatch?: Patch;

  constructor() {
    super('TabsHook');

    this.log('Initialized');
    window.__TABS_HOOK_INSTANCE?.deinit?.();
    window.__TABS_HOOK_INSTANCE = this;

    const tree = (document.getElementById('root') as any)._reactRootContainer._internalRoot.current;
    let qAMRoot: any;
    const findQAMRoot = (currentNode: any, iters: number): any => {
      if (iters >= 55) {
        // currently 45
        return null;
      }
      if (
        currentNode?.memoizedProps?.ModalManager &&
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
      // QAM does not exist until lockscreen is dismissed
      await sleep(1000);
      let waited = !!window.securitystore.GetActiveLockScreenProps();
      while (window.securitystore.GetActiveLockScreenProps()) {
        await sleep(500);
      }
      if (waited) await sleep(1000);
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
      let root = FocusNavController.m_ActiveContext.m_rgGamepadNavigationTrees.find(
        (x: any) => x.m_ID == 'root_1_',
      ).m_context;
      this.qamPatch = afterPatch(qAMRoot.return, 'type', (_: any, ret: any) => {
        try {
          if (!!window.securitystore.GetActiveLockScreenProps()) {
            // Prevents lockscreen focus issues this patch causes for some reason idk.
            try {
              setTimeout(() => {
                FocusNavController.OnContextActivated(root);
                this.debug('Redirected focus on lock screen from QAM to root: ', root);
              }, 1);
            } catch (e) {
              this.error('Error unfocusing QAM on lock screen', e);
            }
          }
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
      qAMRoot.return.alternate.type = qAMRoot.return.type;
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
