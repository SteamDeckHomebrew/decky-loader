import type { ToastData, ToastNotification } from '@decky/api';
import {
  ESteamNotificationAction,
  ErrorBoundary,
  Patch,
  callOriginal,
  findModuleExport,
  injectFCTrampoline,
  replacePatch,
} from '@decky/ui';

import Toast from './components/Toast';
import Logger from './logger';

declare global {
  interface Window {
    __TOASTER_INSTANCE: any;
  }
}

class Toaster extends Logger {
  private toastPatch?: Patch;

  constructor() {
    super('Toaster');

    window.__TOASTER_INSTANCE?.deinit?.();
    window.__TOASTER_INSTANCE = this;

    const ValveToastRenderer = findModuleExport((e) => e?.toString?.()?.includes(`controller:"notification",method:`));
    // TODO find a way to undo this if possible?
    const patchedRenderer = injectFCTrampoline(ValveToastRenderer);
    this.toastPatch = replacePatch(patchedRenderer, 'component', (args: any[]) => {
      if (args?.[0]?.group?.decky || args?.[0]?.group?.notifications?.[0]?.decky) {
        return args[0].group.notifications.map((notification: any) => (
          <ErrorBoundary>
            <Toast toast={notification.data} newIndicator={notification.bNewIndicator} location={args?.[0]?.location} />
          </ErrorBoundary>
        ));
      }
      return callOriginal;
    });

    this.log('Initialized');
  }

  toast(toast: ToastData): ToastNotification {
    if (toast.sound === undefined) toast.sound = 6;
    if (toast.playSound === undefined) toast.playSound = true;
    if (toast.showToast === undefined) toast.showToast = true;
    if (toast.timestamp === undefined) toast.timestamp = new Date();
    if (toast.showNewIndicator === undefined) toast.showNewIndicator = true;
    /* eType 13 
      13: {
        proto: m.mu,
        fnTray: null,
        showToast: !0,
        sound: f.PN.ToastMisc,
        eFeature: l.uX
      }
    */
    const notificationID = window.NotificationStore.m_nNextTestNotificationID++;
    let dismissed = false;
    let shownAt: number | undefined;
    let toastData = {
      // Steam matches toasts and tray groups by notificationID
      notificationID,
      nNotificationID: notificationID,
      bNewIndicator: toast.showNewIndicator,
      rtCreated: Date.now(),
      eType: toast.eType || 31,
      eSource: 1, // Client
      nToastDurationMS: toast.duration || (toast.duration = 5e3),
      data: toast,
      decky: true,
      // Steam calls this every frame while the toast is on screen and hides the toast when it returns true.
      // Steam then does not use its own duration timer, so check the duration here too.
      fnNotificationResolved() {
        shownAt ??= Date.now();
        return dismissed || Date.now() - shownAt >= toastData.nToastDurationMS;
      },
    };
    let group: any;
    function fnTray(toast: any, tray: any) {
      group = {
        eType: toast.eType,
        notifications: [toast],
      };
      tray.unshift(group);
    }
    const info = {
      showToast: toast.showToast,
      sound: toast.sound,
      playSound: toast.playSound,
      eFeature: 0,
      toastDurationMS: toastData.nToastDurationMS,
      bCritical: toast.critical,
      fnTray,
    };
    const self = this;
    let expirationTimeout: number;
    const toastResult: ToastNotification = {
      data: toast,
      dismiss() {
        // it checks against the id of notifications[0]
        try {
          dismissed = true;
          expirationTimeout && clearTimeout(expirationTimeout);
          group && window.NotificationStore.RemoveGroupFromTray(group);
          // the toast queue holds a copy of toastData, so match by id. the predicate keeps the toasts it returns true for
          window.NotificationStore.RemoveFromToastsWhere((e: any) => e?.notificationID !== notificationID);
        } catch (e) {
          self.error('Error while dismissing toast:', e);
        }
      },
    };
    if (toast.expiration) {
      expirationTimeout = setTimeout(() => {
        try {
          group && window.NotificationStore.RemoveGroupFromTray(group);
        } catch (e) {
          this.error('Error while dismissing expired toast:', e);
        }
      }, toast.expiration);
    }
    try {
      window.NotificationStore.ProcessNotification(info, toastData, ESteamNotificationAction.New);
    } catch (e) {
      this.error('Error while sending toast:', e);
    }
    return toastResult;
  }

  deinit() {
    this.toastPatch?.unpatch();
  }
}

export default Toaster;
