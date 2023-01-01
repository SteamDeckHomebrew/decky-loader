import { CustomMainMenuItem, ItemPatch, OverlayPatch } from 'decky-frontend-lib';
import { FC, ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface PublicDeckyMenuState {
  items: Set<CustomMainMenuItem>;
  itemPatches: Map<string, Set<ItemPatch>>;
  overlayPatches: Set<OverlayPatch>;
  overlayComponents: Set<ReactNode>;
}

export class DeckyMenuState {
  private _items = new Set<CustomMainMenuItem>();
  private _itemPatches = new Map<string, Set<ItemPatch>>();
  private _overlayPatches = new Set<OverlayPatch>();
  private _overlayComponents = new Set<ReactNode>();

  public eventBus = new EventTarget();

  publicState(): PublicDeckyMenuState {
    return {
      items: this._items,
      itemPatches: this._itemPatches,
      overlayPatches: this._overlayPatches,
      overlayComponents: this._overlayComponents,
    };
  }

  addItem(item: CustomMainMenuItem) {
    this._items.add(item);
    this.notifyUpdate();
    return item;
  }

  addPatch(path: string, patch: ItemPatch) {
    let patchList = this._itemPatches.get(path);
    if (!patchList) {
      patchList = new Set();
      this._itemPatches.set(path, patchList);
    }
    patchList.add(patch);
    this.notifyUpdate();
    return patch;
  }

  addOverlayPatch(patch: OverlayPatch) {
    this._overlayPatches.add(patch);
    this.notifyUpdate();
    return patch;
  }

  addOverlayComponent(component: ReactNode) {
    this._overlayComponents.add(component);
    this.notifyUpdate();
    return component;
  }

  removePatch(path: string, patch: ItemPatch) {
    const patchList = this._itemPatches.get(path);
    patchList?.delete(patch);
    if (patchList?.size == 0) {
      this._itemPatches.delete(path);
    }
    this.notifyUpdate();
  }

  removeItem(item: CustomMainMenuItem) {
    this._items.delete(item);
    this.notifyUpdate();
    return item;
  }

  removeOverlayPatch(patch: OverlayPatch) {
    this._overlayPatches.delete(patch);
    this.notifyUpdate();
  }

  removeOverlayComponent(component: ReactNode) {
    this._overlayComponents.delete(component);
    this.notifyUpdate();
  }

  private notifyUpdate() {
    this.eventBus.dispatchEvent(new Event('update'));
  }
}

interface DeckyMenuStateContext extends PublicDeckyMenuState {
  addItem: DeckyMenuState['addItem'];
  addPatch: DeckyMenuState['addPatch'];
  addOverlayPatch: DeckyMenuState['addOverlayPatch'];
  addOverlayComponent: DeckyMenuState['addOverlayComponent'];
  removePatch: DeckyMenuState['removePatch'];
  removeOverlayPatch: DeckyMenuState['removeOverlayPatch'];
  removeOverlayComponent: DeckyMenuState['removeOverlayComponent'];
  removeItem: DeckyMenuState['removeItem'];
}

const DeckyMenuStateContext = createContext<DeckyMenuStateContext>(null as any);

export const useDeckyMenuState = () => useContext(DeckyMenuStateContext);

interface Props {
  deckyMenuState: DeckyMenuState;
}

export const DeckyMenuStateContextProvider: FC<Props> = ({ children, deckyMenuState }) => {
  const [publicDeckyMenuState, setPublicDeckyMenuState] = useState<PublicDeckyMenuState>({
    ...deckyMenuState.publicState(),
  });

  useEffect(() => {
    function onUpdate() {
      setPublicDeckyMenuState({ ...deckyMenuState.publicState() });
    }

    deckyMenuState.eventBus.addEventListener('update', onUpdate);

    return () => deckyMenuState.eventBus.removeEventListener('update', onUpdate);
  }, []);

  const addItem = deckyMenuState.addItem.bind(deckyMenuState);
  const addPatch = deckyMenuState.addPatch.bind(deckyMenuState);
  const addOverlayPatch = deckyMenuState.addOverlayPatch.bind(deckyMenuState);
  const addOverlayComponent = deckyMenuState.addOverlayComponent.bind(deckyMenuState);
  const removePatch = deckyMenuState.removePatch.bind(deckyMenuState);
  const removeOverlayPatch = deckyMenuState.removeOverlayPatch.bind(deckyMenuState);
  const removeOverlayComponent = deckyMenuState.removeOverlayComponent.bind(deckyMenuState);
  const removeItem = deckyMenuState.removeItem.bind(deckyMenuState);

  return (
    <DeckyMenuStateContext.Provider
      value={{
        ...publicDeckyMenuState,
        addItem,
        addPatch,
        addOverlayPatch,
        addOverlayComponent,
        removePatch,
        removeOverlayPatch,
        removeOverlayComponent,
        removeItem,
      }}
    >
      {children}
    </DeckyMenuStateContext.Provider>
  );
};
