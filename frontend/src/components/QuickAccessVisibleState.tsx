import { FC, PropsWithChildren, createContext, useContext, useState } from 'react';

export const QuickAccessVisibleState = createContext<boolean>(false);

export const useQuickAccessVisible = () => useContext(QuickAccessVisibleState);

export const QuickAccessVisibleStateProvider: FC<PropsWithChildren<{ tab?: any; initialVal?: boolean }>> = ({
  children,
  tab,
  initialVal,
}) => {
  const initial = initialVal || tab?.initialVisibility;
  const [visible, setVisible] = useState<boolean>(initial);
  // HACK but i can't think of a better way to do this
  if (tab)
    tab.qAMVisibilitySetter = (val: boolean) => {
      if (val != visible) setVisible(val);
    };

  return <QuickAccessVisibleState.Provider value={visible}>{children}</QuickAccessVisibleState.Provider>;
};
