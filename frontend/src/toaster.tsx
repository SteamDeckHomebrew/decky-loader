import { Patch, ToastData, afterPatch, findInReactTree, sleep } from 'decky-frontend-lib';
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
  // private routerHook: RouterHook;
  // private toasterState: DeckyToasterState = new DeckyToasterState();
  private node: any;
  private rNode: any;
  private settingsModule: any;
  private finishStartup?: () => void;
  private ready: Promise<void> = new Promise((res) => (this.finishStartup = res));
  private toasterPatch?: Patch;

  constructor() {
    super('Toaster');
    // this.routerHook = routerHook;

    window.__TOASTER_INSTANCE?.deinit?.();
    window.__TOASTER_INSTANCE = this;
    this.init();
  }

  async init() {
    // this.routerHook.addGlobalComponent('DeckyToaster', () => (
    //   <DeckyToasterStateContextProvider deckyToasterState={this.toasterState}>
    //     <DeckyToaster />
    //   </DeckyToasterStateContextProvider>
    // ));
    let instance: any;
    const tree = (document.getElementById('root') as any)._reactRootContainer._internalRoot.current;
    const findToasterRoot = (currentNode: any, iters: number): any => {
      if (iters >= 50) {
        // currently 40
        return null;
      }
      if (currentNode?.memoizedProps?.className?.startsWith?.('toastmanager_ToastPlaceholder')) {
        this.log(`Toaster root was found in ${iters} recursion cycles`);
        return currentNode;
      }
      if (currentNode.sibling) {
        let node = findToasterRoot(currentNode.sibling, iters + 1);
        if (node !== null) return node;
      }
      if (currentNode.child) {
        let node = findToasterRoot(currentNode.child, iters + 1);
        if (node !== null) return node;
      }
      return null;
    };
    // Toaster does not exist until lockscreen is dismissed
    await sleep(1000);
    let waited = !!window.securitystore.GetActiveLockScreenProps();
    while (window.securitystore.GetActiveLockScreenProps()) {
      await sleep(500);
    }
    if (waited) await sleep(1000);
    instance = findToasterRoot(tree, 0);
    while (!instance) {
      this.error(
        'Failed to find Toaster root node, reattempting in 5 seconds. A developer may need to increase the recursion limit.',
      );
      await sleep(5000);
      instance = findToasterRoot(tree, 0);
    }
    this.node = instance.return;
    this.rNode = this.node.return;
    let toast: any;
    let renderedToast: ReactNode = null;
    let innerPatched: any;
    const repatch = () => {
      if (this.node && !this.node.type.decky) {
        this.toasterPatch = afterPatch(this.node, 'type', (args: any, ret: any) => {
          const inner = findInReactTree(ret.props.children, (x) => x?.props?.onDismiss);
          if (innerPatched) {
            inner.type = innerPatched;
          } else {
            afterPatch(inner, 'type', (innerArgs: any, ret: any) => {
              const currentToast = innerArgs[0]?.notification;
              if (currentToast?.decky) {
                if (currentToast == toast) {
                  ret.props.children = renderedToast;
                } else {
                  toast = currentToast;
                  renderedToast = <Toast toast={toast.data} />;
                  ret.props.children = renderedToast;
                }
              } else {
                toast = null;
                renderedToast = null;
              }
              return ret;
            });
            innerPatched = inner.type;
          }
          return ret;
        });
        this.node.type.decky = true;
        this.node.alternate.type = this.node.type;
      }
    };
    const oRender = this.rNode.stateNode.__proto__.render;
    let int: NodeJS.Timer | undefined;
    this.rNode.stateNode.render = (...args: any[]) => {
      const ret = oRender.call(this.rNode.stateNode, ...args);
      if (ret && !this?.node?.return?.return) {
        clearInterval(int);
        int = setInterval(() => {
          const n = findToasterRoot(tree, 0);
          if (n?.return) {
            clearInterval(int);
            this.node = n.return;
            this.rNode = this.node.return;
            repatch();
          } else {
            this.error('Failed to re-grab Toaster node, trying again...');
          }
        }, 1200);
      }
      repatch();
      return ret;
    };

    this.rNode.stateNode.shouldComponentUpdate = () => true;
    this.rNode.stateNode.forceUpdate();
    delete this.rNode.stateNode.shouldComponentUpdate;

    this.log('Initialized');
    this.finishStartup?.();
  }

  async toast(toast: ToastData) {
    // toast.duration = toast.duration || 5e3;
    // this.toasterState.addToast(toast);
    await this.ready;
    const settings = this.settingsModule?.settings;
    let toastData = {
      nNotificationID: window.NotificationStore.m_nNextTestNotificationID++,
      rtCreated: Date.now(),
      eType: 15,
      nToastDurationMS: toast.duration || (toast.duration = 5e3),
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
    this.toasterPatch?.unpatch();
    this.node.alternate.type = this.node.type;
    delete this.rNode.stateNode.render;
    this.ready = new Promise((res) => (this.finishStartup = res));
    // this.routerHook.removeGlobalComponent('DeckyToaster');
  }
}

export default Toaster;
