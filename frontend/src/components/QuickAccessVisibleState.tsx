import { FC, createContext, useContext, useState } from 'react';

const QuickAccessVisibleState = createContext<boolean>(true);

export const useQuickAccessVisible = () => useContext(QuickAccessVisibleState);

export const QuickAccessVisibleStateProvider: FC<{ initial: boolean; setter: ((val: boolean) => {}[]) | never[] }> = ({
  children,
  initial,
  setter,
}) => {
  const [visible, setVisible] = useState<boolean>(initial);
  const [prev, setPrev] = useState<boolean>(initial);
  // hack to use an array as a "pointer" to pass the setter up the tree
  setter[0] = setVisible;
  if (initial != prev) {
    setPrev(initial);
    setVisible(initial);
  }
  return <QuickAccessVisibleState.Provider value={visible}>{children}</QuickAccessVisibleState.Provider>;
};
