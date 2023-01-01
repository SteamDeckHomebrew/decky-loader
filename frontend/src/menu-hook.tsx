import {
  CustomMainMenuItem,
  ItemPatch,
  MainMenuItem,
  OverlayPatch,
  afterPatch,
  findInReactTree,
  sleep,
} from 'decky-frontend-lib';
import { FC } from 'react';
import { ReactNode, cloneElement, createElement } from 'react';

import { DeckyMenuState, DeckyMenuStateContextProvider, useDeckyMenuState } from './components/DeckyMenuState';
import Logger from './logger';

declare global {
  interface Window {
    __MENU_HOOK_INSTANCE: any;
  }
}

class MenuHook extends Logger {
  private menuRenderer?: any;
  private originalRenderer?: any;
  private menuState: DeckyMenuState = new DeckyMenuState();

  constructor() {
    super('MenuHook');

    this.log('Initialized');
    window.__MENU_HOOK_INSTANCE?.deinit?.();
    window.__MENU_HOOK_INSTANCE = this;
  }

  init() {
    const tree = (document.getElementById('root') as any)._reactRootContainer._internalRoot.current;
    let outerMenuRoot: any;
    const findMenuRoot = (currentNode: any, iters: number): any => {
      if (iters >= 60) {
        // currently 54
        return null;
      }
      if (currentNode?.memoizedProps?.navID == 'MainNavMenuContainer') {
        this.log(`Menu root was found in ${iters} recursion cycles`);
        return currentNode;
      }
      if (currentNode.child) {
        let node = findMenuRoot(currentNode.child, iters + 1);
        if (node !== null) return node;
      }
      if (currentNode.sibling) {
        let node = findMenuRoot(currentNode.sibling, iters + 1);
        if (node !== null) return node;
      }
      return null;
    };

    (async () => {
      outerMenuRoot = findMenuRoot(tree, 0);
      while (!outerMenuRoot) {
        this.error(
          'Failed to find Menu root node, reattempting in 5 seconds. A developer may need to increase the recursion limit.',
        );
        await sleep(5000);
        outerMenuRoot = findMenuRoot(tree, 0);
      }
      this.log('found outermenuroot', outerMenuRoot);
      const menuRenderer = outerMenuRoot.return;
      this.menuRenderer = menuRenderer;
      this.originalRenderer = menuRenderer.type;
      let toReplace = new Map<string, ReactNode>();

      let patchedInnerMenu: any;
      let overlayComponentManager: any;

      const DeckyOverlayComponentManager = () => {
        const { overlayComponents } = useDeckyMenuState();

        return <>{overlayComponents.values()}</>;
      };

      const DeckyInnerMenuWrapper = (props: { innerProps: any }) => {
        const { overlayPatches } = useDeckyMenuState();

        const rendererRet = this.originalRenderer(props.innerProps);

        // Find the first array of children, this contains [mainmenu, overlay]
        const childArray = findInReactTree(rendererRet, (x) => x?.[0]?.type);

        // Insert the overlay components manager
        if (!overlayComponentManager) {
          overlayComponentManager = <DeckyOverlayComponentManager />;
        }

        childArray.push(overlayComponentManager);

        // This must be cached in patchedInnerMenu to prevent re-renders
        if (patchedInnerMenu) {
          childArray[0].type = patchedInnerMenu;
        } else {
          afterPatch(childArray[0], 'type', (_, ret) => {
            const { itemPatches, items } = useDeckyMenuState();

            const itemList = ret.props.children;

            // Add custom menu items
            if (items.size > 0) {
              const button = findInReactTree(ret.props.children, (x) =>
                x?.type?.toString()?.includes('exactRouteMatch:'),
              );

              const MenuItemComponent: FC<MainMenuItem> = button.type;

              items.forEach((item) => {
                let realIndex = 0; // there are some non-item things in the array
                let count = 0;
                itemList.forEach((i: any) => {
                  if (count == item.index) return;
                  if (i?.type == MenuItemComponent) count++;
                  realIndex++;
                });
                itemList.splice(realIndex, 0, createElement(MenuItemComponent, item));
              });
            }

            // Apply and revert patches
            itemList.forEach((item: { props: MainMenuItem }, index: number) => {
              if (!item?.props?.route) return;
              const replaced = toReplace.get(item?.props?.route as string);
              if (replaced) {
                itemList[index] = replaced;
                toReplace.delete(item?.props.route as string);
              }
              if (item?.props?.route && itemPatches.has(item.props.route as string)) {
                toReplace.set(item?.props?.route as string, itemList[index]);
                itemPatches.get(item.props.route as string)?.forEach((patch) => {
                  const oType = itemList[index].type;
                  itemList[index] = patch({
                    ...cloneElement(itemList[index]),
                    type: (props) => createElement(oType, props),
                  });
                });
              }
            });

            return ret;
          });
          patchedInnerMenu = childArray[0].type;
        }

        // Apply patches to the overlay
        if (childArray[1]) {
          overlayPatches.forEach((patch) => (childArray[1] = patch(childArray[1])));
        }

        return rendererRet;
      };

      const DeckyOuterMenuWrapper = (props: any) => {
        return (
          <DeckyMenuStateContextProvider deckyMenuState={this.menuState}>
            <DeckyInnerMenuWrapper innerProps={props} />
          </DeckyMenuStateContextProvider>
        );
      };
      menuRenderer.type = DeckyOuterMenuWrapper;
      if (menuRenderer.alternate) {
        menuRenderer.alternate.type = menuRenderer.type;
      }
      this.log('Finished initial injection');
    })();
  }

  deinit() {
    this.menuRenderer.type = this.originalRenderer;
    this.menuRenderer.alternate.type = this.menuRenderer.type;
  }

  addItem(item: CustomMainMenuItem) {
    return this.menuState.addItem(item);
  }

  addPatch(path: string, patch: ItemPatch) {
    return this.menuState.addPatch(path, patch);
  }

  addOverlayPatch(patch: OverlayPatch) {
    return this.menuState.addOverlayPatch(patch);
  }

  addOverlayComponent(component: ReactNode) {
    return this.menuState.addOverlayComponent(component);
  }

  removePatch(path: string, patch: ItemPatch) {
    return this.menuState.removePatch(path, patch);
  }

  removeItem(item: CustomMainMenuItem) {
    return this.menuState.removeItem(item);
  }

  removeOverlayPatch(patch: OverlayPatch) {
    return this.menuState.removeOverlayPatch(patch);
  }

  removeOverlayComponent(component: ReactNode) {
    return this.menuState.removeOverlayComponent(component);
  }
}

export default MenuHook;
