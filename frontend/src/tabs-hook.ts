import Logger from './logger';

declare global {
  interface Window {
    __TABS_HOOK_INSTANCE: any;
  }
  interface Array<T> {
    __filter: any;
  }
}

const isTabsArray = (tabs) => {
  const length = tabs.length;
  return length === 7 && tabs[length - 1]?.key === 6 && tabs[length - 1]?.tab;
};

interface Tab {
  id: string;
  title: any;
  content: any;
  icon: any;
}

class TabsHook extends Logger {
  // private keys = 7;
  tabs: Tab[] = [];

  constructor() {
    super('TabsHook');

    this.log('Initialized');
    window.__TABS_HOOK_INSTANCE = this;

    const self = this;

    const filter = Array.prototype.__filter ?? Array.prototype.filter;
    Array.prototype.__filter = filter;
    Array.prototype.filter = function (...args) {
      if (isTabsArray(this)) {
        self.render(this);
      }
      // @ts-ignore
      return filter.call(this, ...args);
    };
  }

  add(tab: Tab) {
    this.log('Adding tab', tab.id, 'to render array');
    this.tabs.push(tab);
  }

  removeById(id: string) {
    this.log('Removing tab', id);
    this.tabs = this.tabs.filter((tab) => tab.id !== id);
  }

  render(existingTabs: any[]) {
    for (const { title, icon, content, id } of this.tabs) {
      existingTabs.push({
        key: id,
        title,
        tab: icon,
        panel: content,
      });
    }
  }
}

export default TabsHook;
