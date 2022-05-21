import Logger from './logger';
import { beforePatch, fakeRenderComponent as fakeCreateElement, replacePatch, sleep, unpatch } from './utils';
import { Router, all } from './webpack';

declare global {
  interface Window {
    __WINDOW_HOOK_INSTANCE: any;
    SteamClient: any;
  }
}

export let BrowserView;

class WindowHook extends Logger {
  BrowserView: any;
  windows: {};

  constructor() {
    super('WindowHook');

    this.log('Initialized');
    window.__WINDOW_HOOK_INSTANCE?.deinit?.();
    window.__WINDOW_HOOK_INSTANCE = this;

    const self = this;

    // const filter = Array.prototype.__filter ?? Array.prototype.filter;
    // Array.prototype.__filter = filter;
    // Array.prototype.filter = function (...args) {
    //   if (isTabsArray(this)) {
    //     self.render(this);
    //   }
    //   // @ts-ignore
    //   return filter.call(this, ...args);
    // };

    this.windows = {};

    this.init();
  }

  async init() {
    while (!window.SP_REACT?.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
      await sleep(10); // need to wait a little for react
    }
    BrowserView = await this.getBrowserViewClass();
    const self = this;

    beforePatch(BrowserView.prototype, 'GetRenderElement', function (...args) {
      self.handleNewWindow(this.m_viewWindow?.document?.title, this);
    });

    console.dir(BrowserView);
  }

  // TODO: type this
  getBrowserViewClass(): Promise<any> {
    return new Promise((resolve) => {
      const createWindow = all()
        .map((m) => {
          if (typeof m !== 'object') return undefined;
          for (let prop in m) {
            if (
              m[prop]?.toString()?.includes('.GetRenderElement().ownerDocument.defaultView') &&
              m[prop]?.toString()?.includes('CreateView((()=>')
            )
              return m[prop];
          }
        })
        .find((x) => x);

      fakeCreateElement(() => {
        const hooks = window.SP_REACT.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current;

        hooks.useState = (v) => {
          let val = v;

          return [
            val,
            (n) => {
              n.DestroyView(); // Destroy the CEF window we just created.
              val = n;
              resolve(n.constructor);
            },
          ];
        };

        // These patches prevent this from creating an actual CEF window
        replacePatch(window.SteamClient.BrowserView, 'CreatePopup', (...args) => {
          console.log('hooked view');
          return { browserView: { SetName: () => {} } };
        });

        replacePatch(window, 'open', (...args) => {
          console.log('hooked open');
          return {
            document: {
              write: () => {},
              getElementById: () => ({}),
              createElement: () => ({
                setAttribute: () => {},
              }),
              getElementsByTagName: (name) => {
                if (name == 'head')
                  return [
                    {
                      getElementsByTagName: () => [],
                      prepend: () => {},
                    },
                  ];
                return [];
              },
            },
            addEventListener: (title, handler) => {},
          };
          // self.handleNewWindow(this.m_viewWindow?.document?.title, this);
        });

        createWindow({}, { title: 'DeckyModuleGetter' });

        unpatch(window, 'open');
        unpatch(window.SteamClient.BrowserView, 'CreatePopup');
        // How this is actually used:
        // getWindow(A => Router.NavigationManager.RegisterInputSource(A), { title: "QuickAccess"})
      });
    });
  }

  handleNewWindow(name: string, view: any) {
    this.windows[name] = view;
  }

  async getWindow(name: string) {
    // TODO: make this event-based
    while (!this.windows[name]) {
      await sleep(100);
    }

    return this.windows[name];
  }

  deinit() {
    unpatch(BrowserView.prototype, 'GetRenderElement');
  }
}

export default WindowHook;
