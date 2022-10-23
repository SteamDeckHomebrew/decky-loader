import { Patch, ToastData, sleep } from 'decky-frontend-lib';
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
    // let instance: any;
    // while (true) {
    //   instance = findInReactTree(
    //     (document.getElementById('root') as any)._reactRootContainer._internalRoot.current,
    //     (x) => x?.memoizedProps?.className?.startsWith?.('toastmanager_ToastPlaceholder'),
    //   );
    //   if (instance) break;
    //   this.debug('finding instance');
    //   await sleep(2000);
    // }
    // // const windowManager = findModuleChild((m) => {
    // //   if (typeof m !== 'object') return false;
    // //   for (let prop in m) {
    // //     if (m[prop]?.prototype?.GetRenderElement) return m[prop];
    // //   }
    // //   return false;
    // // });
    // this.node = instance.return.return;
    // let toast: any;
    // let renderedToast: ReactNode = null;
    // console.log(instance, this.node);
    // // replacePatch(window.SteamClient.BrowserView, "Destroy", (args: any[]) => {
    // //   console.debug("destroy", args)
    // //   return callOriginal;
    // // })
    // // let node = this.node.child.updateQueue.lastEffect;
    // // while (node.next && !node.deckyPatched) {
    // //   node = node.next;
    // //   if (node.deps[1] == "notificationtoasts") {
    // //     console.log("Deleting destroy");
    // //     node.deckyPatched = true;
    // //     node.create = () => {console.debug("VVVVVVVVVVV")};
    // //     node.destroy = () => {console.debug("AAAAAAAAAAAAAAAAaaaaaaaaaaaaaaa")};
    // //   }
    // // }
    // this.node.stateNode.render = (...args: any[]) => {
    //   const ret = this.node.stateNode.__proto__.render.call(this.node.stateNode, ...args);
    //   console.log('toast', ret);
    //     if (ret) {
    //       console.log(ret)
    //       // this.instanceRetPatch = replacePatch(ret, 'type', (innerArgs: any) => {
    //       //   console.log("inner toast", innerArgs)
    //       //   // @ts-ignore
    //       //   const oldEffect = window.SP_REACT.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current.useEffect;
    //       //   // @ts-ignore
    //       //   window.SP_REACT.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current.useEffect = (effect, deps) => {
    //       //     console.log(effect, deps)
    //       //     if (deps?.[1] == "notificationtoasts") {
    //       //       console.log("run")
    //       //       effect();
    //       //     }
    //       //     return oldEffect(effect, deps);
    //       //   }
    //       //   const ret = this.instanceRetPatch?.original(...args);
    //       //   console.log("inner ret", ret)
    //       //   // @ts-ignore
    //       //   window.SP_REACT.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current.useEffect = oldEffect;
    //       //   return ret
    //       // });
    //     }
    //   //       console.log("toast ret", ret)
    //   //       if (ret?.props?.children[1]?.children?.props) {
    //   //         const currentToast = ret.props.children[1].children.props.notification;
    //   //         if (currentToast?.decky) {
    //   //           if (currentToast == toast) {
    //   //             ret.props.children[1].children = renderedToast;
    //   //           } else {
    //   //             toast = currentToast;
    //   //             renderedToast = <Toast toast={toast} />;
    //   //             ret.props.children[1].children = renderedToast;
    //   //           }
    //   //         } else {
    //   //           toast = null;
    //   //           renderedToast = null;
    //   //         }
    //   //       }
    //   //       return ret;
    //   //     });
    //   //   }
    //   return ret;
    // };
    // this.settingsModule = findModuleChild((m) => {
    //   if (typeof m !== 'object') return undefined;
    //   for (let prop in m) {
    //     if (typeof m[prop]?.settings && m[prop]?.communityPreferences) return m[prop];
    //   }
    // });
    // // const idx = FocusNavController.m_ActiveContext.m_rgGamepadNavigationTrees.findIndex((x: any) => x.m_ID == "ToastContainer");
    // // if (idx > -1) {
    // //   FocusNavController.m_ActiveContext.m_rgGamepadNavigationTrees.splice(idx, 1)
    // // }
    // this.node.stateNode.forceUpdate();
    // this.node.stateNode.shouldComponentUpdate = () => {
    //   return false;
    // };
    // this.log('Initialized');
    // this.ready = true;
  }

  async toast(toast: ToastData) {
    // while (!this.ready) {
    //   await sleep(100);
    // }
    // const settings = this.settingsModule?.settings;
    // let toastData = {
    //   nNotificationID: window.NotificationStore.m_nNextTestNotificationID++,
    //   rtCreated: Date.now(),
    //   eType: 15,
    //   nToastDurationMS: toast.duration || 5e3,
    //   data: toast,
    //   decky: true,
    // };
    // // @ts-ignore
    // toastData.data.appid = () => 0;
    // if (
    //   (settings?.bDisableAllToasts && !toast.critical) ||
    //   (settings?.bDisableToastsInGame && !toast.critical && window.NotificationStore.BIsUserInGame())
    // )
    //   return;
    // window.NotificationStore.m_rgNotificationToasts.push(toastData);
    // window.NotificationStore.DispatchNextToast();
  }

  deinit() {
    // this.instanceRetPatch?.unpatch();
    // this.node && delete this.node.stateNode.shouldComponentUpdate;
    // this.node && this.node.stateNode.forceUpdate();
  }
}

export default Toaster;
