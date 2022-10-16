import { Patch, QuickAccessTab, afterPatch, sleep } from 'decky-frontend-lib';
import { memo } from 'react';

import { QuickAccessVisibleStateProvider } from './components/QuickAccessVisibleState';
import Logger from './logger';

declare global {
  interface Window {
    __TABS_HOOK_INSTANCE: any;
  }
  interface Array<T> {
    __filter: any;
  }
}

const isTabsArray = (tabs: any) => {
  const length = tabs.length;
  return length >= 7 && tabs[length - 1]?.tab;
};

interface Tab {
  id: QuickAccessTab | number;
  title: any;
  content: any;
  icon: any;
}

class TabsHook extends Logger {
  // private keys = 7;
  tabs: Tab[] = [];
  private quickAccess: any;
  private tabRenderer: any;
  private memoizedQuickAccess: any;
  private cNode: any;

  private qAPTree: any;
  private rendererTree: any;

  private cNodePatch?: Patch;

  constructor() {
    super('TabsHook');

    this.log('Initialized');
    window.__TABS_HOOK_INSTANCE?.deinit?.();
    window.__TABS_HOOK_INSTANCE = this;

    const self = this;
    const tree = (document.getElementById('root') as any)._reactRootContainer._internalRoot.current;
    let scrollRoot: any;
    async function findScrollRoot(currentNode: any, iters: number): Promise<any> {
      if (iters >= 30) {
        self.error(
          'Scroll root was not found before hitting the recursion limit, a developer will need to increase the limit.',
        );
        return null;
      }
      currentNode = currentNode?.child;
      if (currentNode?.type?.prototype?.RemoveSmartScrollContainer) {
        self.log(`Scroll root was found in ${iters} recursion cycles`);
        return currentNode;
      }
      if (!currentNode) return null;
      if (currentNode.sibling) {
        let node = await findScrollRoot(currentNode.sibling, iters + 1);
        if (node !== null) return node;
      }
      return await findScrollRoot(currentNode, iters + 1);
    }
    (async () => {
      scrollRoot = await findScrollRoot(tree, 0);
      while (!scrollRoot) {
        this.log('Failed to find scroll root node, reattempting in 5 seconds');
        await sleep(5000);
        scrollRoot = await findScrollRoot(tree, 0);
      }
      let newQA: any;
      let newQATabRenderer: any;
      this.cNodePatch = afterPatch(scrollRoot.stateNode, 'render', (_: any, ret: any) => {
        if (!this.quickAccess && ret.props.children.props.children[4]) {
          this.quickAccess = ret?.props?.children?.props?.children[4].type;
          newQA = (...args: any) => {
            const ret = this.quickAccess.type(...args);
            if (ret) {
              if (!newQATabRenderer) {
                this.tabRenderer = ret.props.children[1].children.type;
                newQATabRenderer = (...qamArgs: any[]) => {
                  const oFilter = Array.prototype.filter;
                  Array.prototype.filter = function (...args: any[]) {
                    if (isTabsArray(this)) {
                      self.render(this, qamArgs[0].visible);
                    }
                    // @ts-ignore
                    return oFilter.call(this, ...args);
                  };
                  // TODO remove array hack entirely and use this instead const tabs = ret.props.children.props.children[0].props.children[1].props.children[0].props.children[0].props.tabs
                  const ret = this.tabRenderer(...qamArgs);
                  Array.prototype.filter = oFilter;
                  return ret;
                };
              }
              this.rendererTree = ret.props.children[1].children;
              ret.props.children[1].children.type = newQATabRenderer;
            }
            return ret;
          };
          this.memoizedQuickAccess = memo(newQA);
          this.memoizedQuickAccess.isDeckyQuickAccess = true;
        }
        if (ret.props.children.props.children[4]) {
          this.qAPTree = ret.props.children.props.children[4];
          ret.props.children.props.children[4].type = this.memoizedQuickAccess;
        }
        return ret;
      });
      this.cNode = scrollRoot;
      this.cNode.stateNode.forceUpdate();
      this.log('Finished initial injection');
    })();
  }

  deinit() {
    this.cNodePatch?.unpatch();
    if (this.qAPTree) this.qAPTree.type = this.quickAccess;
    if (this.rendererTree) this.rendererTree.type = this.tabRenderer;
    if (this.cNode) this.cNode.stateNode.forceUpdate();
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
    for (const { title, icon, content, id } of this.tabs) {
      existingTabs.push({
        key: id,
        title,
        tab: icon,
        panel: <QuickAccessVisibleStateProvider visible={visible}>{content}</QuickAccessVisibleStateProvider>,
      });
    }
  }
}

export default TabsHook;
