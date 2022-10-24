import { QuickAccessTab, quickAccessMenuClasses, sleep } from 'decky-frontend-lib';

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
  private oFilter: (...args: any[]) => any;

  constructor() {
    super('TabsHook');

    this.log('Initialized');
    window.__TABS_HOOK_INSTANCE?.deinit?.();
    window.__TABS_HOOK_INSTANCE = this;

    const self = this;
    const oFilter = (this.oFilter = Array.prototype.filter);
    Array.prototype.filter = function patchedFilter(...args: any[]) {
      if (isTabsArray(this)) {
        self.render(this);
      }
      // @ts-ignore
      return oFilter.call(this, ...args);
    };

    if (document.title != 'SP')
      try {
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

          while (!qAMRoot?.stateNode?.forceUpdate) {
            qAMRoot = qAMRoot.return;
          }
          qAMRoot.stateNode.shouldComponentUpdate = () => true;
          qAMRoot.stateNode.forceUpdate();
          delete qAMRoot.stateNode.shouldComponentUpdate;
        })();
      } catch (e) {
        this.log('Failed to rerender QAM', e);
      }
  }

  deinit() {
    Array.prototype.filter = this.oFilter;
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
