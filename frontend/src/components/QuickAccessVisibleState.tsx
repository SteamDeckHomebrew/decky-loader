import { FC, createContext, useContext } from 'react';

const QuickAccessVisibleState = createContext<boolean>(true);

export const useQuickAccessVisible = () => useContext(QuickAccessVisibleState);

interface Props {
  visible: boolean;
}

export const QuickAccessVisibleStateProvider: FC<Props> = ({ children, visible }) => {
  return <QuickAccessVisibleState.Provider value={visible}>{children}</QuickAccessVisibleState.Provider>;
};
