import { Patch, QuickAccessTab, afterPatch, quickAccessMenuClasses, sleep } from 'decky-frontend-lib';
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
      currentNode = currentNode?.child;
      if (
        currentNode?.memoizedProps?.className &&
        currentNode?.memoizedProps?.className.startsWith(quickAccessMenuClasses.ViewPlaceholder)
      ) {
        self.log(`QAM root was found in ${iters} recursion cycles`);
        return currentNode;
      }
      if (!currentNode) return null;
      if (currentNode.sibling) {
        let node = await findQAMRoot(currentNode.sibling, iters + 1);
        if (node !== null) return node;
      }
      return await findQAMRoot(currentNode, iters + 1);
    }
    (async () => {
      qAMRoot = await findQAMRoot(tree, 0);
      while (!qAMRoot) {
        this.error(
          'Failed to find QAM root node, reattempting in 5 seconds. A developer may need to increase the recursion limit.',
        );
        await sleep(5000);
        qAMRoot = await findQAMRoot(tree, 0);
      }
      let newQA: any;
      let newQATabRenderer: any;
      qAMRoot = qAMRoot?.sibling?.child;
      this.qamPatch = afterPatch(qAMRoot, 'type', (args: any, ret: any) => {
        try {
          //     let child = ret.props.children;
          //     while (!child.length && (child.length != 4 || child.length != 5) && child.props.children) {
          //       child = child.props.children
          //     }
          //     child = child.length == 4 ? child[0] : child[4];
          //     console.log(child)
          //     if (!this.quickAccess) {
          //       this.quickAccess = child;
          //       newQA = (...args: any) => {
          // const ret = this.quickAccess.type(...args);
          // console.log("RET", ret)
          // if (ret) {
          // if (!newQATabRenderer) {
          //   this.tabRenderer = ret.props.children[1].children.type;
          //   newQATabRenderer = (...qamArgs: any[]) => {
          //     const oFilter = Array.prototype.filter;
          //     Array.prototype.filter = function (...args: any[]) {
          //       if (isTabsArray(this)) {
          self.render(
            ret.props.children[1].props.children[0].props.children[1].props.children[0].props.children[0].props.tabs,
          );
          //     }
          //     // @ts-ignore
          //     return oFilter.call(this, ...args);
          //   };
          //   // TODO remove array hack entirely and use this instead const tabs = ret.props.children.props.children[0].props.children[1].props.children[0].props.children[0].props.tabs
          //   const ret = this.tabRenderer(...qamArgs);
          //   console.log("RENDERRRRRR")
          //   Array.prototype.filter = oFilter;
          //   return ret;
          // };
          // }
          // this.rendererTree = ret.props.children[1].children;
          // ret.props.children[1].children.type = newQATabRenderer;
          // }
          // return ret;
          //       };
          //       this.memoizedQuickAccess = memo(newQA);
          //       this.memoizedQuickAccess.isDeckyQuickAccess = true;
          //     }
          //     if (child) {
          //       this.qAPTree = child;
          //       child.type = this.memoizedQuickAccess;
          //     }
        } catch (e) {
          this.error('Error patching QAM', e);
        }

        return ret;
      });
      // this.cNode = qAMRoot;
      // // this.cNode.stateNode.shouldComponentUpdate = () => true;
      // this.cNode.stateNode.forceUpdate();
      // delete this.cNode.stateNode.shouldComponentUpdate;
      this.log('Finished initial injection');
    })();
  }

  deinit() {
    this.qamPatch?.unpatch();
    // this.cNodePatch?.unpatch();
    // if (this.qAPTree) this.qAPTree.type = this.quickAccess;
    // if (this.rendererTree) this.rendererTree.type = this.tabRenderer;
    // if (this.cNode) this.cNode.stateNode.forceUpdate();
  }

  add(tab: Tab) {
    this.debug('Adding tab', tab.id, 'to render array');
    this.tabs.push(tab);
  }

  removeById(id: number) {
    this.debug('Removing tab', id);
    this.tabs = this.tabs.filter((tab) => tab.id !== id);
  }

  render(existingTabs: any[]) {
    if (existingTabs.find((t) => t.decky)) return;
    for (const { title, icon, content, id } of this.tabs) {
      existingTabs.push({
        key: id,
        title,
        tab: icon,
        decky: true,
        panel: <QuickAccessVisibleStateProvider>{content}</QuickAccessVisibleStateProvider>,
      });
    }
  }
}

export default TabsHook;
