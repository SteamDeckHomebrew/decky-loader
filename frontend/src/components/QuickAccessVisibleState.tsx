import { FC, createContext, useContext, useState } from 'react';

const QuickAccessVisibleState = createContext<boolean>(true);

export const useQuickAccessVisible = () => useContext(QuickAccessVisibleState);

export const QuickAccessVisibleStateProvider: FC<{ initial: boolean; tab: any }> = ({ children, initial, tab }) => {
  const [visible, setVisible] = useState<boolean>(initial);
  const [prev, setPrev] = useState<boolean>(initial);
  // HACK but i can't think of a better way to do this
  tab.qAMVisibilitySetter = setVisible;
  if (initial != prev) {
    setPrev(initial);
    setVisible(initial);
  }
  return <QuickAccessVisibleState.Provider value={visible}>{children}</QuickAccessVisibleState.Provider>;
};
