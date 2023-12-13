import {
  Module,
  Patch,
  ToastData,
  afterPatch,
  findInReactTree,
  findModuleChild,
  getReactRoot,
  sleep,
} from 'decky-frontend-lib';
import { ReactNode } from 'react';

import Toast from './components/Toast';
import Logger from './logger';

declare global {
  interface Window {
    __TOASTER_INSTANCE: any;
    settingsStore: any;
    NotificationStore: any;
  }
}

class Toaster extends Logger {
  // private routerHook: RouterHook;
  // private toasterState: DeckyToasterState = new DeckyToasterState();
  private node: any;
  private rNode: any;
  private audioModule: any;
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
    const tree = getReactRoot(document.getElementById('root') as any);
    const findToasterRoot = (currentNode: any, iters: number): any => {
      if (iters >= 80) {
        // currently 66
        return null;
      }
      if (
        currentNode?.memoizedProps?.className?.startsWith?.('gamepadtoasts_GamepadToastPlaceholder') ||
        currentNode?.memoizedProps?.className?.startsWith?.('toastmanager_ToastPlaceholder') ||
        currentNode?.memoizedProps?.className?.startsWith?.('toastmanager_ToastPopup')
      ) {
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
        this.toasterPatch = afterPatch(this.node, 'type', (_: any, ret: any) => {
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

    this.audioModule = findModuleChild((m: Module) => {
      if (typeof m !== 'object') return undefined;
      for (let prop in m) {
        try {
          if (m[prop].PlayNavSound && m[prop].RegisterCallbackOnPlaySound) return m[prop];
        } catch {
          return undefined;
        }
      }
    });

    this.log('Initialized');
    this.finishStartup?.();
  }

  async toast(toast: ToastData) {
    // toast.duration = toast.duration || 5e3;
    // this.toasterState.addToast(toast);
    await this.ready;
    let toastData = {
      nNotificationID: window.NotificationStore.m_nNextTestNotificationID++,
      rtCreated: Date.now(),
      eType: toast.eType || 11,
      nToastDurationMS: toast.duration || (toast.duration = 5e3),
      data: toast,
      decky: true,
    };
    // @ts-ignore
    toastData.data.appid = () => 0;
    if (toast.sound === undefined) toast.sound = 6;
    if (toast.playSound === undefined) toast.playSound = true;
    if (toast.showToast === undefined) toast.showToast = true;
    if (
      (window.settingsStore.settings.bDisableAllToasts && !toast.critical) ||
      (window.settingsStore.settings.bDisableToastsInGame &&
        !toast.critical &&
        window.NotificationStore.BIsUserInGame())
    )
      return;
    if (toast.playSound) this.audioModule?.PlayNavSound(toast.sound);
    if (toast.showToast) {
      window.NotificationStore.m_rgNotificationToasts.push(toastData);
      window.NotificationStore.DispatchNextToast();
    }
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
