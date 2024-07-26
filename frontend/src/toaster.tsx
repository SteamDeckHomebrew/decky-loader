import type { ToastData } from '@decky/api';
import { Patch, callOriginal, findModuleExport, injectFCTrampoline, replacePatch } from '@decky/ui';

import Toast from './components/Toast';
import Logger from './logger';

// TODO export
enum ToastType {
  New,
  Update,
  Remove,
}

declare global {
  interface Window {
    __TOASTER_INSTANCE: any;
    settingsStore: any;
    NotificationStore: any;
  }
}

class Toaster extends Logger {
  private finishStartup?: () => void;
  private ready: Promise<void> = new Promise((res) => (this.finishStartup = res));
  private toastPatch?: Patch;

  constructor() {
    super('Toaster');

    window.__TOASTER_INSTANCE?.deinit?.();
    window.__TOASTER_INSTANCE = this;
    this.init();
  }

  // TODO maybe move to constructor lol
  async init() {
    const ValveToastRenderer = findModuleExport((e) => e?.toString()?.includes(`controller:"notification",method:`));
    // TODO find a way to undo this if possible?
    const patchedRenderer = injectFCTrampoline(ValveToastRenderer);
    this.toastPatch = replacePatch(patchedRenderer, 'component', (args: any[]) => {
      this.debug('render toast', args);
      if (args?.[0]?.group?.decky || args?.[0]?.group?.notifications?.[0]?.decky) {
        return args[0].group.notifications.map((notification: any) => (
          <Toast toast={notification.data} location={args?.[0]?.location} />
        ));
      }
      return callOriginal;
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
    if (toast.sound === undefined) toast.sound = 6;
    if (toast.playSound === undefined) toast.playSound = true;
    if (toast.showToast === undefined) toast.showToast = true;
    if (toast.timestamp === undefined) toast.timestamp = new Date();
    function fnTray(toast: any, tray: any) {
      let group = {
        eType: toast.eType,
        notifications: [toast],
      };
      tray.unshift(group);
      // TODO do we need to handle expiration? how do we do that?
    }
    const info = {
      showToast: toast.showToast,
      sound: toast.sound,
      eFeature: 0,
      toastDurationMS: toastData.nToastDurationMS,
      bCritical: toast.critical,
      fnTray,
    };
    window.NotificationStore.ProcessNotification(info, toastData, ToastType.New);
  }

  deinit() {
    this.toastPatch?.unpatch();
  }
}

export default Toaster;
