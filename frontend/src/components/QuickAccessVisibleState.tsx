import { FC, createContext, useContext, useEffect, useRef, useState } from 'react';

const QuickAccessVisibleState = createContext<boolean>(true);

export const useQuickAccessVisible = () => useContext(QuickAccessVisibleState);

export const QuickAccessVisibleStateProvider: FC<{}> = ({ children }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<boolean>(false);
  useEffect(() => {
    const win: Window | void | null = divRef?.current?.ownerDocument.defaultView;
    if (!win) return;
    setVisible(win.document.hasFocus());
    const onBlur = () => setVisible(false);
    const onFocus = () => setVisible(true);

    win.addEventListener('blur', onBlur);
    win.addEventListener('focus', onFocus);
    return () => {
      win.removeEventListener('blur', onBlur);
      win.removeEventListener('focus', onFocus);
    };
  }, [divRef]);
  console.log(visible);
  return (
    <div ref={divRef}>
      <QuickAccessVisibleState.Provider value={visible}>{children}</QuickAccessVisibleState.Provider>
    </div>
  );
};
