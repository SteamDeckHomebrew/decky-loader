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
  private viteToastContainer?: HTMLDivElement;

  constructor() {
    super('Toaster');

    window.__TOASTER_INSTANCE?.deinit?.();
    window.__TOASTER_INSTANCE = this;

    if (window.webpackChunksteamui) {
      const ValveToastRenderer = findModuleExport((e) =>
        e?.toString?.()?.includes(`controller:"notification",method:`),
      );
      if (ValveToastRenderer) {
        // TODO find a way to undo this if possible?
        const patchedRenderer = injectFCTrampoline(ValveToastRenderer);
        this.toastPatch = replacePatch(patchedRenderer, 'component', (args: any[]) => {
          if (args?.[0]?.group?.decky || args?.[0]?.group?.notifications?.[0]?.decky) {
            return args[0].group.notifications.map((notification: any) => (
              <ErrorBoundary>
                <Toast
                  toast={notification.data}
                  newIndicator={notification.bNewIndicator}
                  location={args?.[0]?.location}
                />
              </ErrorBoundary>
            ));
          }
          return callOriginal;
        });
      } else {
        this.warn('Valve toast renderer not found, custom toasts disabled');
      }
    }

    this.log('Initialized');
  }

  private showViteToast(toast: ToastData): ToastNotification {
    // Steam's notification pipeline crashes on Decky toasts in the Vite build.
    const container =
      this.viteToastContainer ??
      (this.viteToastContainer = (() => {
        const element = document.createElement('div');
        element.id = 'decky-toast-host';
        element.style.cssText =
          'position:fixed;right:16px;bottom:16px;display:flex;flex-direction:column;gap:8px;z-index:2147483647;pointer-events:none';
        document.body.appendChild(element);
        return element;
      })());

    const node = document.createElement('div');
    node.style.cssText =
      'pointer-events:auto;background:rgba(20,30,40,.95);color:#fff;padding:10px 14px;border-radius:6px;font:13px "Motiva Sans",Arial,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.4);max-width:320px';
    node.textContent = typeof toast.content === 'string' ? toast.content : 'Decky';
    container.appendChild(node);

    const remove = () => node.remove();
    const timeout = window.setTimeout(remove, toast.duration ?? 5000);
    return {
      data: toast,
      dismiss: () => {
        window.clearTimeout(timeout);
        remove();
      },
    };
  }

  toast(toast: ToastData): ToastNotification {
    if (toast.sound === undefined) toast.sound = 6;
    if (toast.playSound === undefined) toast.playSound = true;
    if (toast.showToast === undefined) toast.showToast = true;
    if (toast.timestamp === undefined) toast.timestamp = new Date();
    if (toast.showNewIndicator === undefined) toast.showNewIndicator = true;

    if (!window.webpackChunksteamui) {
      return this.showViteToast(toast);
    }

    /* eType 13 
      13: {
        proto: m.mu,
        fnTray: null,
        showToast: !0,
        sound: f.PN.ToastMisc,
        eFeature: l.uX
      }
    */
    let toastData = {
      nNotificationID: window.NotificationStore.m_nNextTestNotificationID++,
      bNewIndicator: toast.showNewIndicator,
      rtCreated: Date.now(),
      eType: toast.eType || 31,
      eSource: 1, // Client
      nToastDurationMS: toast.duration || (toast.duration = 5e3),
      data: toast,
      decky: true,
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
          expirationTimeout && clearTimeout(expirationTimeout);
          group && window.NotificationStore.RemoveGroupFromTray(group);
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
    this.viteToastContainer?.remove();
    this.viteToastContainer = undefined;
  }
}

export default Toaster;
