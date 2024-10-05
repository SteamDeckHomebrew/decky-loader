import { FC, useEffect, useRef, useState } from 'react';

import { useDeckyState } from './DeckyState';
import PluginView from './PluginView';
import { QuickAccessVisibleState } from './QuickAccessVisibleState';

const DeckyDesktopSidebar: FC = () => {
  const { desktopMenuOpen, setDesktopMenuOpen } = useDeckyState();
  const [closed, setClosed] = useState<boolean>(!desktopMenuOpen);
  const [openAnimStart, setOpenAnimStart] = useState<boolean>(desktopMenuOpen);
  const closedInterval = useRef<number | null>(null);

  useEffect(() => {
    const anim = requestAnimationFrame(() => setOpenAnimStart(desktopMenuOpen));
    return () => cancelAnimationFrame(anim);
  }, [desktopMenuOpen]);

  useEffect(() => {
    closedInterval.current && clearTimeout(closedInterval.current);
    if (desktopMenuOpen) {
      setClosed(false);
    } else {
      closedInterval.current = setTimeout(() => setClosed(true), 500);
    }
  }, [desktopMenuOpen]);
  return (
    <>
      <div
        className="deckyDesktopSidebarDim"
        style={{
          position: 'absolute',
          height: 'calc(100% - 78px - 50px)',
          width: '100%',
          top: '78px',
          left: '0px',
          zIndex: 998,
          background: 'rgba(0, 0, 0, 0.7)',
          opacity: openAnimStart ? 1 : 0,
          display: desktopMenuOpen || !closed ? 'flex' : 'none',
          transition: 'opacity 0.4s cubic-bezier(0.65, 0, 0.35, 1)',
        }}
        onClick={() => setDesktopMenuOpen(false)}
      />

      <div
        className="deckyDesktopSidebar"
        style={{
          position: 'absolute',
          height: 'calc(100% - 78px - 50px)',
          width: '350px',
          paddingLeft: '16px',
          top: '78px',
          right: '0px',
          zIndex: 999,
          transition: 'transform 0.4s cubic-bezier(0.65, 0, 0.35, 1)',
          transform: openAnimStart ? 'translateX(0px)' : 'translateX(366px)',
          overflowY: 'scroll',
          // prevents chromium border jank
          display: desktopMenuOpen || !closed ? 'flex' : 'none',
          flexDirection: 'column',
          background: '#171d25',
        }}
      >
        <QuickAccessVisibleState.Provider value={desktopMenuOpen || !closed}>
          <PluginView desktop={true} />
        </QuickAccessVisibleState.Provider>
      </div>
    </>
  );
};

export default DeckyDesktopSidebar;
