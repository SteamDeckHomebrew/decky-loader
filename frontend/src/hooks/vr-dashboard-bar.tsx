// Hook the SteamVR Hotbar
import { ErrorBoundary, Patch, afterPatch, findInReactTree, findModuleExport, getReactRoot } from '@decky/ui';
import { ReactNode, createElement } from 'react';

import Logger from '../logger';

declare global {
  interface Window {
    __VR_DASHBAORD_BAR_HOOK_INSTANCE: any;
  }
}

// TODO kinda dumb
enum VRDashboardBarButtonID {
  Decky = 999,
}

export interface VRDashboardBarButton {
  id: VRDashboardBarButtonID | number;
  active?: boolean;
  children?: ReactNode;
  tooltip?: ReactNode;
  popupContents?: ReactNode;
  onActivate?: () => void;
  refBarPopupHandle?: any; // TODO idk
  onPopupVisibilityChanged?: (visible: boolean) => void;
}

class VRDashboardBarHook extends Logger {
  rightSideButtons: VRDashboardBarButton[] = [];
  private rendererdRightSideButtons: ReactNode[] = [];
  private barPatch?: Patch;
  private barButton?: any;

  constructor() {
    super('VRDashboardBarHook');

    this.log('Initialized');
    window.__VR_DASHBAORD_BAR_HOOK_INSTANCE?.deinit?.();
    window.__VR_DASHBAORD_BAR_HOOK_INSTANCE = this;
  }

  init() {
    this.barButton = findModuleExport((e) => e?.render?.toString()?.includes('VRDashboardBarSmallButtonActive'));
    const barComponent = findModuleExport((e) => e?.type?.toString()?.includes('vrLocation=="dashboard-bar"'));

    this.barPatch = afterPatch(barComponent, 'type', (_, ret) => {
      const nodes = findInReactTree(ret, (x) => x?.length > 6);
      if (!window?.securitystore?.IsLockScreenActive?.()) nodes.splice(4, 0, this.rendererdRightSideButtons);
      return ret;
    });

    // Patch already rendered bar
    const root = getReactRoot(document.getElementById('root') as any);
    const barNode =
      root &&
      findInReactTree(
        root,
        (n: any) => n.elementType == barComponent || (barComponent != null && n.elementType == barComponent),
      ); // need elementType, because case where type is actually mobx wrapper
    if (barNode) {
      // Only affects this fiber node so we don't need to unpatch here
      barNode.type = barNode.elementType.type;
      if (barNode?.alternate) {
        barNode.alternate.type = barNode.type;
      }
    }
  }

  deinit() {
    this.barPatch?.unpatch();
  }

  addRightSideButton(button: VRDashboardBarButton) {
    this.debug('Adding RSB', button.id, 'to render array');
    this.rightSideButtons.push(button);
    this.renderRightSideButtons();
  }

  removeRightSideButton(id: number) {
    this.debug('Removing RSB', id);
    this.rightSideButtons = this.rightSideButtons.filter((button) => button.id !== id);
    this.renderRightSideButtons();
  }

  renderRightSideButtons() {
    const arr = [];
    for (const button of this.rightSideButtons) {
      arr.push(
        createElement(this.barButton, {
          active: button.active,
          children: <ErrorBoundary>{button.children}</ErrorBoundary>,
          tooltip: button.tooltip,
          popupContents: <ErrorBoundary>{button.popupContents}</ErrorBoundary>,
          onActivate: button.onActivate,
          refBarPopupHandle: button.refBarPopupHandle,
          onPopupVisibilityChanged: button.onPopupVisibilityChanged,
        }),
      );
    }
    this.rendererdRightSideButtons = arr;
  }
}

export default VRDashboardBarHook;
