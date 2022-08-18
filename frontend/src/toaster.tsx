import { ToastData, afterPatch, findInReactTree, findModuleChild, sleep, unpatch } from 'decky-frontend-lib';

import Toast from './components/Toast';
import Logger from './logger';

declare global {
  interface Window {
    __TOASTER_INSTANCE: any;
    NotificationStore: any;
  }
}

class Toaster extends Logger {
  private instanceRet: any;
  private node: any;
  private settingsModule: any;

  constructor() {
    super('Toaster');

    window.__TOASTER_INSTANCE?.deinit?.();
    window.__TOASTER_INSTANCE = this;
    this.init();
  }

  async init() {
    this.settingsModule = findModuleChild((m) => {
      if (typeof m !== 'object') return undefined;
      for (let prop in m) {
        if (typeof m[prop]?.settings?.bDisableToastsInGame !== 'undefined') return m[prop];
      }
    });

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
    this.node.stateNode.render = (...args: any[]) => {
      const ret = this.node.stateNode.__proto__.render.call(this.node.stateNode, ...args);
      if (ret) {
        this.instanceRet = ret;
        afterPatch(ret, 'type', (_: any, ret: any) => {
          if (ret?.props?.children[1]?.children?.props?.notification?.decky) {
            const toast = ret.props.children[1].children.props.notification;
            ret.props.children[1].children.type = () => <Toast toast={toast} />;
          }
          return ret;
        });
      }
      return ret;
    };
    this.node.stateNode.forceUpdate();
    this.log('Initialized');
  }

  toast(toast: ToastData) {
    const settings = this.settingsModule.settings;
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
      (settings.bDisableAllToasts && !toast.critical) ||
      (settings.bDisableToastsInGame && !toast.critical && window.NotificationStore.BIsUserInGame())
    )
      return;
    window.NotificationStore.m_rgNotificationToasts.push(toastData);
    window.NotificationStore.DispatchNextToast();
    window.NotificationStore.m_rgNotificationToasts.pop();
  }

  deinit() {
    this.instanceRet && unpatch(this.instanceRet, 'type');
    this.node && delete this.node.stateNode.render;
    this.node && this.node.stateNode.forceUpdate();
  }
}

export default Toaster;
