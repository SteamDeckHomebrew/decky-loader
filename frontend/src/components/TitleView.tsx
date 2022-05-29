import { DialogButton, staticClasses } from 'decky-frontend-lib';
import { VFC } from 'react';
import { FaShoppingBag } from 'react-icons/fa';

import { useDeckyState } from './DeckyState';

const TitleView: VFC = () => {
  const { activePlugin } = useDeckyState();

  const openPluginStore = () => fetch('http://127.0.0.1:1337/methods/open_plugin_store', { method: 'POST' });

  if (activePlugin === null) {
    return (
      <div className={staticClasses.Title}>
        Decky
        <div style={{ position: 'absolute', top: '3px', right: '16px', zIndex: 20 }}>
          <DialogButton style={{ minWidth: 0, padding: '10px 12px' }} onClick={openPluginStore}>
            <FaShoppingBag style={{ display: 'block' }} />
          </DialogButton>
        </div>
      </div>
    );
  }

  return (
    <div className={staticClasses.Title} style={{ paddingLeft: '60px' }}>
      {activePlugin.name}
    </div>
  );
};

export default TitleView;
