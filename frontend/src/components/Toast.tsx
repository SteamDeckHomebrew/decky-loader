import { ToastData, findModule, joinClassNames } from 'decky-frontend-lib';
import { FunctionComponent } from 'react';

interface ToastProps {
  toast: ToastData;
}

export const toastClasses = findModule((mod) => {
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
      style={{ '--toast-duration': `${toast.duration}ms` } as React.CSSProperties}
      onClick={toast.onClick}
      className={joinClassNames(templateClasses.ShortTemplate, toast.className || '')}
    >
      {toast.logo && <div className={templateClasses.StandardLogoDimensions}>{toast.logo}</div>}
      <div className={joinClassNames(templateClasses.Content, toast.contentClassName || '')}>
        <div className={templateClasses.Header}>
          {toast.icon && <div className={templateClasses.Icon}>{toast.icon}</div>}
          <div className={templateClasses.Title}>{toast.title}</div>
        </div>
        <div className={templateClasses.Body}>{toast.body}</div>
      </div>
    </div>
  );
};

export default Toast;
