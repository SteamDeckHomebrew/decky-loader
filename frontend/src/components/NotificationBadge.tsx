import { CSSProperties, FunctionComponent } from 'react';

interface NotificationBadgeProps {
  show?: boolean;
  vr?: boolean;
  style?: CSSProperties;
}

const NotificationBadge: FunctionComponent<NotificationBadgeProps> = ({ show, style, vr }) => {
  return show ? (
    vr ? (
      // whoever made transform:scale completely break absolute positioning goes straight to super turbo hell this took me an hour
      <div
        style={{
          top: 0,
          left: 0,
          marginLeft: 'auto',
          width: 0,
          height: 0,
          overflow: 'visible',
          transform: 'translate(0px, 0px)',
        }}
      >
        <div
          style={{
            position: 'fixed',
            top: '-18px',
            right: '-6px',
            width: '10px',
            height: '10px',
            background: 'orange',
            borderRadius: '50%',
            ...style,
          }}
        />
      </div>
    ) : (
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
    )
  ) : null;
};

export default NotificationBadge;
