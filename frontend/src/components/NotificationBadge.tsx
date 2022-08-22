import { CSSProperties, FunctionComponent } from 'react';

interface NotificationBadgeProps {
  show?: boolean;
  style?: CSSProperties;
}

const NotificationBadge: FunctionComponent<NotificationBadgeProps> = ({ show, style }) => {
  return show ? (
    <div
      style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        height: '10px',
        width: '10px',
        background: 'orange',
        borderRadius: '50%',
        ...style,
      }}
    />
  ) : null;
};

export default NotificationBadge;
