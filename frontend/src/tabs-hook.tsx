// TabsHook for versions after the Desktop merge
import { Patch, QuickAccessTab, afterPatch, findInReactTree, findSP, sleep } from 'decky-frontend-lib';

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

  async init() {
    this.qAMRoot = await this.getQuickMenuRoot();

    let patchedInnerQAM: any;
    this.qamPatch = afterPatch(this.qAMRoot.return, 'type', (_: any, ret: any) => {
      try {
        if (this.qAMRoot?.child && !this.qAMRoot?.child?.type?.decky) {
          afterPatch(this.qAMRoot.child, 'type', (_: any, ret: any) => {
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
          this.qAMRoot.child.type.decky = true;
          this.qAMRoot.child.alternate.type = this.qAMRoot.child.type;
        }
      } catch (e) {
        this.error('Error patching QAM', e);
      }

      return ret;
    });

    if (this.qAMRoot.return.alternate) {
      this.qAMRoot.return.alternate.type = this.qAMRoot.return.type;
    }
    this.log('Finished initial injection');
  }

  async getQuickMenuRoot() {
    while (typeof GamepadNavTree === 'undefined') {
      await sleep(50);
    }

    const parentNode = findSP().document.querySelector("[class*='BasicUI']");
    if (!parentNode) return null;

    const [reactInstanceKey] = Object.keys(parentNode);
    const parentReactNode = parentNode[reactInstanceKey];

    return findInReactTree(
      parentReactNode,
      (n) =>
        typeof n.memoizedProps?.visible !== 'undefined' && n.type?.toString()?.includes('QuickAccessMenuBrowserView'),
    );
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
        if (tab?.decky && tab?.qAMVisibilitySetter) tab?.qAMVisibilitySetter(visible);
      }
      return;
    }
    for (const { title, icon, content, id } of this.tabs) {
      const tab: any = {
        key: id,
        title,
        tab: icon,
        decky: true,
      };
      tab.panel = (
        <QuickAccessVisibleStateProvider initial={visible} tab={tab}>
          {content}
        </QuickAccessVisibleStateProvider>
      );
      existingTabs.push(tab);
    }
  }
}

export default TabsHook;
