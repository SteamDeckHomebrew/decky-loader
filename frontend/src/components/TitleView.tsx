import { DialogButton, Focusable, Router, staticClasses } from 'decky-frontend-lib';
import { CSSProperties, VFC } from 'react';
import { BsGearFill } from 'react-icons/bs';
import { FaArrowLeft, FaStore } from 'react-icons/fa';

import { useDeckyState } from './DeckyState';

const titleStyles: CSSProperties = {
  display: 'flex',
  paddingTop: '3px',
  paddingRight: '16px',
};

const TitleView: VFC = () => {
  const { activePlugin, closeActivePlugin } = useDeckyState();

  const onSettingsClick = () => {
    Router.CloseSideMenus();
    Router.Navigate('/decky/settings');
  };

  const onStoreClick = () => {
    Router.CloseSideMenus();
    Router.Navigate('/decky/store');
  };

  if (activePlugin === null) {
    return (
      <Focusable style={titleStyles} className={staticClasses.Title}>
        <div style={{ marginRight: 'auto', flex: 0.9 }}>Decky</div>
        <DialogButton
          style={{ height: '28px', width: '40px', minWidth: 0, padding: '10px 12px' }}
          onClick={onStoreClick}
        >
          <FaStore style={{ marginTop: '-4px', display: 'block' }} />
        </DialogButton>
        <DialogButton
          style={{ height: '28px', width: '40px', minWidth: 0, padding: '10px 12px' }}
          onClick={onSettingsClick}
        >
          <BsGearFill style={{ marginTop: '-4px', display: 'block' }} />
        </DialogButton>
      </Focusable>
    );
  }

  return (
    <div className={staticClasses.Title} style={titleStyles}>
      <DialogButton
        style={{ height: '28px', width: '40px', minWidth: 0, padding: '10px 12px' }}
        onClick={closeActivePlugin}
      >
        <FaArrowLeft style={{ marginTop: '-4px', display: 'block' }} />
      </DialogButton>
      <div style={{ flex: 0.9 }}>{activePlugin.name}</div>
    </div>
  );
};

export default TitleView;
