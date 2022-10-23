import { ToastData } from 'decky-frontend-lib';
import { FC, createContext, useContext, useEffect, useState } from 'react';

interface PublicDeckyToasterState {
  toasts: Set<ToastData>;
}

export class DeckyToasterState {
  // TODO a set would be better
  private _toasts: Set<ToastData> = new Set();

  public eventBus = new EventTarget();

  publicState(): PublicDeckyToasterState {
    return { toasts: this._toasts };
  }

  addToast(toast: ToastData) {
    this._toasts.add(toast);
    this.notifyUpdate();
  }

  removeToast(toast: ToastData) {
    this._toasts.delete(toast);
    this.notifyUpdate();
  }

  private notifyUpdate() {
    this.eventBus.dispatchEvent(new Event('update'));
  }
}

interface DeckyToasterContext extends PublicDeckyToasterState {
  addToast(toast: ToastData): void;
  removeToast(toast: ToastData): void;
}

const DeckyToasterContext = createContext<DeckyToasterContext>(null as any);

export const useDeckyToasterState = () => useContext(DeckyToasterContext);

interface Props {
  deckyToasterState: DeckyToasterState;
}

export const DeckyToasterStateContextProvider: FC<Props> = ({ children, deckyToasterState }) => {
  const [publicDeckyToasterState, setPublicDeckyToasterState] = useState<PublicDeckyToasterState>({
    ...deckyToasterState.publicState(),
  });

  useEffect(() => {
    function onUpdate() {
      setPublicDeckyToasterState({ ...deckyToasterState.publicState() });
    }

    deckyToasterState.eventBus.addEventListener('update', onUpdate);

    return () => deckyToasterState.eventBus.removeEventListener('update', onUpdate);
  }, []);

  const addToast = deckyToasterState.addToast.bind(deckyToasterState);
  const removeToast = deckyToasterState.removeToast.bind(deckyToasterState);

  return (
    <DeckyToasterContext.Provider value={{ ...publicDeckyToasterState, addToast, removeToast }}>
      {children}
    </DeckyToasterContext.Provider>
  );
};
