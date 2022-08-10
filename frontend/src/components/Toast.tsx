import { ToastData, findModule, joinClassNames } from 'decky-frontend-lib';
import { FunctionComponent } from 'react';

interface ToastProps {
  toast: {
    data: ToastData;
    nToastDurationMS: number;
  };
}

const toastClasses = findModule((mod) => {
  if (typeof mod !== 'object') return false;

  if (mod.ToastPlaceholder) {
    return true;
  }

  return false;
});

const templateClasses = findModule((mod) => {
  if (typeof mod !== 'object') return false;

  if (mod.ShortTemplate) {
    return true;
  }

  return false;
});

const Toast: FunctionComponent<ToastProps> = ({ toast }) => {
  return (
    <div
      style={{ '--toast-duration': `${toast.nToastDurationMS}ms` } as React.CSSProperties}
      className={joinClassNames(toastClasses.ToastPopup, toastClasses.toastEnter)}
    >
      <div
        onClick={toast.data.onClick}
        className={joinClassNames(templateClasses.ShortTemplate, toast.data.className || '')}
      >
        {toast.data.logo && <div className={templateClasses.StandardLogoDimensions}>{toast.data.logo}</div>}
        <div className={joinClassNames(templateClasses.Content, toast.data.contentClassName || '')}>
          <div className={templateClasses.Header}>
            {toast.data.icon && <div className={templateClasses.Icon}>{toast.data.icon}</div>}
            <div className={templateClasses.Title}>{toast.data.title}</div>
          </div>
          <div className={templateClasses.Body}>{toast.data.body}</div>
        </div>
      </div>
    </div>
  );
};

export default Toast;
