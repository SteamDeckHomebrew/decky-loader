// Adds Decky's tabs as buttons to the Steam Frame's VR dashboard bar, as the VR dashboard doesn't
// render the QAM components TabsHook patches. Steam does the same for some of its own QAM tabs.
import {
  ErrorBoundary,
  Patch,
  afterPatch,
  findInReactTree,
  findModule,
  findModuleExport,
  getGamepadNavigationTrees,
  getReactRoot,
  joinClassNames,
  sleep,
} from '@decky/ui';

import { QuickAccessVisibleStateProvider } from './components/QuickAccessVisibleState';
import Logger from './logger';
import TabsHook from './tabs-hook';

declare global {
  interface Window {
    __VR_BAR_HOOK_INSTANCE: any;
  }
}

const VR_ROOT_NAV_TREE_ID = 'GamepadUI_VR_Full_Root';
const VR_POLL_INTERVAL_MS = 5000;
const FALLBACK_PANEL_STYLE = { width: '300px', maxHeight: '600px', overflowY: 'auto' } as const;

// findSP() can't tell, it also finds the Deck's main window
function isVRDashboard(): boolean {
  return !!getGamepadNavigationTrees()?.some((t: any) => t?.m_ID === VR_ROOT_NAV_TREE_ID);
}

class VRBarHook extends Logger {
  private trayPatch?: Patch;
  private tray?: any;
  private stopped = false;
  private contentsClass?: string;
  private panelClass?: string;

  constructor(private tabsHook: TabsHook) {
    super('VRBarHook');

    window.__VR_BAR_HOOK_INSTANCE?.deinit?.();
    window.__VR_BAR_HOOK_INSTANCE = this;
  }

  async init() {
    // The VR dashboard may come up after Decky has loaded
    while (!this.stopped && !isVRDashboard()) await sleep(VR_POLL_INTERVAL_MS);
    if (this.stopped) return;

    try {
      this.patchTray();
    } catch (e) {
      this.error('Failed to patch VR dashboard bar', e);
    }
  }

  deinit() {
    this.stopped = true;
    this.trayPatch?.unpatch();
    this.refreshRenderedTray();
    this.trayPatch = undefined;
    this.tray = undefined;
  }

  private patchTray() {
    const tray = findModuleExport(
      (e) => e?.$$typeof === Symbol.for('react.memo') && e?.type?.toString?.()?.includes('"dashboard-bar"'),
    );
    const BarButton = findModuleExport((e) => {
      if (e?.$$typeof !== Symbol.for('react.forward_ref')) return false;
      const src = e.render?.toString?.() ?? '';
      return src.includes('"VRDashboardBarSmallButton"') && src.includes('popupContents');
    });
    if (!tray || !BarButton) {
      this.error('Failed to find VR dashboard bar components', { tray: !!tray, BarButton: !!BarButton });
      return;
    }
    this.tray = tray;

    // Same popup classes as Steam's own bar tabs
    const classes = findModule((m) => m?.DashboardBarPopupContents && m?.QuickAccessPopupPanel);
    if (classes) {
      this.contentsClass = joinClassNames(classes.DashboardBarPopupContents, classes.QuickAccess ?? '');
      this.panelClass = joinClassNames(classes.QuickAccessPopupPanel, classes.BottomFade ?? '');
    }

    this.trayPatch = afterPatch(tray, 'type', (_args: any[], ret: any) => {
      try {
        this.render(ret.props.children, BarButton);
      } catch (e) {
        this.error('Failed to add Decky to the VR dashboard bar', e);
      }
      return ret;
    });
    this.refreshRenderedTray();
    this.log('Patched VR dashboard bar');
  }

  private render(barItems: any[], BarButton: any) {
    for (const { id, icon, content } of this.tabsHook.tabs) {
      barItems.push(
        <ErrorBoundary key={`decky-vr-bar-${id}`}>
          <BarButton
            tooltip="Decky"
            popupContents={
              <div className={this.contentsClass}>
                <div className={this.panelClass} style={this.panelClass ? undefined : FALLBACK_PANEL_STYLE}>
                  <ErrorBoundary>
                    {/* The popup only mounts its contents while open */}
                    <QuickAccessVisibleStateProvider tab={{ initialVisibility: true }}>
                      {content}
                    </QuickAccessVisibleStateProvider>
                  </ErrorBoundary>
                </div>
              </div>
            }
          >
            {icon}
          </BarButton>
        </ErrorBoundary>,
      );
    }
  }

  // Patch already rendered tray
  private refreshRenderedTray() {
    if (!this.tray) return;
    const root = getReactRoot(document.getElementById('root') as any);
    const node = root && findInReactTree(root, (n: any) => n?.elementType === this.tray);
    if (!node) return;

    node.type = this.tray.type;
    if (node.alternate) node.alternate.type = node.type;

    // The memo ignores forceUpdate() from above, its first hook is a forceUpdate counter (localization)
    const hook = node.memoizedState;
    if (typeof hook?.memoizedState === 'number' && typeof hook.queue?.dispatch === 'function') {
      hook.queue.dispatch((n: number) => n + 1);
    }
  }
}

export default VRBarHook;
