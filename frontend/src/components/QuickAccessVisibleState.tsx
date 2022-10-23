import { FC, createContext, useContext, useEffect, useRef, useState } from 'react';

const QuickAccessVisibleState = createContext<boolean>(true);

export const useQuickAccessVisible = () => useContext(QuickAccessVisibleState);

export const QuickAccessVisibleStateProvider: FC<{}> = ({ children }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<boolean>(false);
  useEffect(() => {
    const doc: Document | void | null = divRef?.current?.ownerDocument;
    if (!doc) return;
    setVisible(doc.visibilityState == 'visible');
    const onChange = (e: Event) => {
      setVisible(doc.visibilityState == 'visible');
    };
    doc.addEventListener('visibilitychange', onChange);
    return () => {
      doc.removeEventListener('visibilitychange', onChange);
    };
  }, [divRef]);
  console.log(visible);
  return (
    <div ref={divRef}>
      <QuickAccessVisibleState.Provider value={visible}>{children}</QuickAccessVisibleState.Provider>
    </div>
  );
};
