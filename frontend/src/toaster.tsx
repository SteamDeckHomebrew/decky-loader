import { Patch, ToastData, afterPatch, findInReactTree, findModuleChild, sleep } from 'decky-frontend-lib';
import { ReactNode } from 'react';

import Toast from './components/Toast';
import Logger from './logger';

declare global {
  interface Window {
    __TOASTER_INSTANCE: any;
    NotificationStore: any;
  }
}

class Toaster extends Logger {
  private instanceRetPatch?: Patch;
  private node: any;
  private settingsModule: any;
  private ready: boolean = false;

  constructor() {
    super('Toaster');

    window.__TOASTER_INSTANCE?.deinit?.();
    window.__TOASTER_INSTANCE = this;
    this.init();
  }

  async init() {
    let instance: any;
    while (true) {
      instance = findInReactTree(
        (document.getElementById('root') as any)._reactRootContainer._internalRoot.current,
        (x) => x?.memoizedProps?.className?.startsWith?.('toastmanager_ToastPlaceholder'),
      );
      if (instance) break;
      this.debug('finding instance');
      await sleep(2000);
    }

    this.node = instance.return.return;
    let toast: any;
    let renderedToast: ReactNode = null;
    this.node.stateNode.render = (...args: any[]) => {
      const ret = this.node.stateNode.__proto__.render.call(this.node.stateNode, ...args);
      if (ret) {
        this.instanceRetPatch = afterPatch(ret, 'type', (_: any, ret: any) => {
          if (ret?.props?.children[1]?.children?.props) {
            const currentToast = ret.props.children[1].children.props.notification;
            if (currentToast?.decky) {
              if (currentToast == toast) {
                ret.props.children[1].children = renderedToast;
              } else {
                toast = currentToast;
                renderedToast = <Toast toast={toast} />;
                ret.props.children[1].children = renderedToast;
              }
            } else {
              toast = null;
              renderedToast = null;
            }
          }
          return ret;
        });
      }
      return ret;
    };
    this.node.stateNode.forceUpdate();
    this.settingsModule = findModuleChild((m) => {
      if (typeof m !== 'object') return undefined;
      for (let prop in m) {
        if (typeof m[prop]?.settings && m[prop]?.communityPreferences) return m[prop];
      }
    });
    this.log('Initialized');
    this.ready = true;
  }

  async toast(toast: ToastData) {
    while (!this.ready) {
      await sleep(100);
    }
    const settings = this.settingsModule?.settings;
    let toastData = {
      nNotificationID: window.NotificationStore.m_nNextTestNotificationID++,
      rtCreated: Date.now(),
      eType: 15,
      nToastDurationMS: toast.duration || 5e3,
      data: toast,
      decky: true,
    };
    // @ts-ignore
    toastData.data.appid = () => 0;
    if (
      (settings?.bDisableAllToasts && !toast.critical) ||
      (settings?.bDisableToastsInGame && !toast.critical && window.NotificationStore.BIsUserInGame())
    )
      return;
    window.NotificationStore.m_rgNotificationToasts.push(toastData);
    window.NotificationStore.DispatchNextToast();
  }

  deinit() {
    this.instanceRetPatch?.unpatch();
    this.node && delete this.node.stateNode.render;
    this.node && this.node.stateNode.forceUpdate();
  }
}

export default Toaster;
