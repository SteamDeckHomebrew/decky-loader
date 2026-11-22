import type { ToastData } from '@decky/api';
import { Focusable, Navigation, joinClassNames, toastClasses } from '@decky/ui';
import { FC, memo } from 'react';

import Logger from '../logger';

const logger = new Logger('ToastRenderer');

// TODO there are more of these
export enum ToastLocation {
  /** Big Picture popup toasts */
  GAMEPADUI_POPUP = 1,
  /** QAM Notifications tab */
  GAMEPADUI_QAM = 3,
}

interface ToastProps {
  toast: ToastData;
  newIndicator?: boolean;
}

interface ToastRendererProps extends ToastProps {
  location: ToastLocation;
}

const popupClasses = {
  ShortTemplate: 'kg8VJS07NZk-',
  Content: 'vjeKRorxqWY-',
  Header: 'UWjdKshdhD8-',
  Icon: 'q9vQBNOskjU-',
  Title: 'RZ1644uUH-k-',
  Body: '_5LTIC-a3DVw-',
};

// These are memoized as they like to randomly rerender

const GamepadUIPopupToast: FC<Omit<ToastProps, 'newIndicator'>> = memo(({ toast }) => {
  return (
    <div
      style={{ '--toast-duration': `${toast.duration}ms` } as React.CSSProperties}
      onClick={toast.onClick}
      className={joinClassNames(popupClasses.ShortTemplate, toast.className || '', 'DeckyGamepadUIPopupToast')}
    >
      {toast.logo && <div className={toastClasses.StandardLogoDimensions}>{toast.logo}</div>}
      <div className={joinClassNames(popupClasses.Content, toast.contentClassName || '')}>
        <div className={popupClasses.Header}>
          {toast.icon && <div className={popupClasses.Icon}>{toast.icon}</div>}
          <div className={popupClasses.Title}>{toast.title}</div>
        </div>
        <div className={popupClasses.Body}>{toast.body}</div>
      </div>
    </div>
  );
});

const GamepadUIQAMToast: FC<ToastProps> = memo(({ toast, newIndicator }) => {
  // The fields aren't mismatched, the logic for these is just a bit weird.
  return (
    <Focusable
      onActivate={() => {
        toast.onClick?.();
        Navigation.CloseSideMenus();
      }}
      className={joinClassNames(
        toastClasses.StandardTemplateContainer,
        toast.className || '',
        'DeckyGamepadUIQAMToast',
      )}
    >
      <div className={toastClasses.StandardTemplate}>
        {toast.logo && <div className={toastClasses.StandardLogoDimensions}>{toast.logo}</div>}
        <div className={joinClassNames(toastClasses.Content, toast.contentClassName || '')}>
          <div className={toastClasses.Header}>
            {toast.icon && <div className={toastClasses.Icon}>{toast.icon}</div>}
            {toast.title && <div className={toastClasses.Title}>{toast.title}</div>}
            {/* timestamp should always be defined by toaster */}
            {/* TODO check how valve does this */}
            {toast.timestamp && (
              <div className={toastClasses.Timestamp}>
                {toast.timestamp.toLocaleTimeString(undefined, { timeStyle: 'short' })}
              </div>
            )}
          </div>
          {toast.body && <div className={toastClasses.StandardNotificationDescription}>{toast.body}</div>}
          {toast.subtext && <div className={toastClasses.StandardNotificationSubText}>{toast.subtext}</div>}
        </div>
        {newIndicator && (
          <div className={toastClasses.NewIndicator}>
            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50" fill="none">
              <circle fill="currentColor" cx="25" cy="25" r="25"></circle>
            </svg>
          </div>
        )}
      </div>
    </Focusable>
  );
});

export const ToastRenderer: FC<ToastRendererProps> = memo(({ toast, location, newIndicator }) => {
  switch (location) {
    default:
      logger.warn(`Toast UI not implemented for location ${location}! Falling back to GamepadUIQAMToast.`);
      return <GamepadUIQAMToast toast={toast} newIndicator={false} />;
    case ToastLocation.GAMEPADUI_POPUP:
      return <GamepadUIPopupToast toast={toast} />;
    case ToastLocation.GAMEPADUI_QAM:
      return <GamepadUIQAMToast toast={toast} newIndicator={newIndicator} />;
  }
});

export default ToastRenderer;
