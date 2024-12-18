import { CSSProperties, FC } from 'react';

import DeckyDesktopSidebar from './DeckyDesktopSidebar';
import DeckyIcon from './DeckyIcon';
import { useDeckyState } from './DeckyState';

const DeckyDesktopUI: FC = () => {
  const { desktopMenuOpen, setDesktopMenuOpen } = useDeckyState();
  return (
    <>
      <style>
        {`
            .deckyDesktopIcon {
                color: #67707b;
            }
            .deckyDesktopIcon:hover {
                color: #fff;
            }
            `}
      </style>
      <DeckyIcon
        className="deckyDesktopIcon"
        width={24}
        height={24}
        onClick={() => setDesktopMenuOpen(!desktopMenuOpen)}
        style={
          {
            position: 'absolute',
            top: '36px', // nav text is 34px but 36px looks nicer to me
            right: '10px', // <- is 16px but 10px looks nicer to me
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            transition: 'color 0.3s linear',
            '-webkit-app-region': 'no-drag',
          } as CSSProperties
        }
      />
      <DeckyDesktopSidebar />
    </>
  );
};

export default DeckyDesktopUI;
