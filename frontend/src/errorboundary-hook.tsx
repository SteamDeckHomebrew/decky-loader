import { Patch, callOriginal, findModuleExport, replacePatch } from '@decky/ui';

import DeckyErrorBoundary from './components/DeckyErrorBoundary';
import Logger from './logger';
import { getLikelyErrorSourceFromValveError } from './utils/errors';

declare global {
  interface Window {
    __ERRORBOUNDARY_HOOK_INSTANCE: any;
  }
}

class ErrorBoundaryHook extends Logger {
  private errorBoundaryPatch?: Patch;
  private errorCheckPatch?: Patch;
  public doNotReportErrors: boolean = false;
  private disableReportingTimer: number = 0;

  constructor() {
    super('ErrorBoundaryHook');

    this.log('Initialized');
    window.__ERRORBOUNDARY_HOOK_INSTANCE?.deinit?.();
    window.__ERRORBOUNDARY_HOOK_INSTANCE = this;
  }

  init() {
    // valve writes only the sanest of code
    const exp = /^\(\)=>\(.\|\|.\(new .\),.\)$/;
    const initErrorReportingStore = findModuleExport(
      (e) => typeof e == 'function' && e?.toString && exp.test(e.toString()),
    );

    if (!initErrorReportingStore) {
      this.error('could not find initErrorReportingStore! error boundary hook disabled!');
      return;
    }
    // will replace the existing one for us seemingly? doesnt matter anyway lol
    const errorReportingStore = initErrorReportingStore();

    // NUH UH.
    // Object.defineProperty(Object.getPrototypeOf(errorReportingStore), 'reporting_enabled', {
    //   get: () => false,
    // });
    // errorReportingStore.m_bEnabled = false;

    // @ts-ignore
    // window.errorStore = errorReportingStore;

    const react15069WorkaroundRegex = /    at .+\.componentDidCatch\..+\.callback /;
    this.errorCheckPatch = replacePatch(Object.getPrototypeOf(errorReportingStore), 'BIsBlacklisted', (args: any[]) => {
      const [errorSource, wasPlugin, shouldReport] = getLikelyErrorSourceFromValveError(args[0]);
      this.debug('Caught an error', args, {
        errorSource,
        wasPlugin,
        shouldReport,
        skipAllReporting: this.doNotReportErrors || this.disableReportingTimer,
      });
      if (!shouldReport) this.temporarilyDisableReporting();
      // react#15069 workaround. this took 2 hours to figure out.
      if (
        args[0]?.message?.[3]?.[0] &&
        args[0]?.message?.[1]?.[0] == '    at console.error ' &&
        react15069WorkaroundRegex.test(args[0].message[3][0])
      ) {
        this.debug('ignoring early report caused by react#15069');
        return true;
      }
      if (this.doNotReportErrors || this.disableReportingTimer) return true;
      return shouldReport ? callOriginal : true;
    });

    const ValveErrorBoundary = findModuleExport(
      (e) => e.InstallErrorReportingStore && e?.prototype?.Reset && e?.prototype?.componentDidCatch,
    );
    if (!ValveErrorBoundary) {
      this.error('could not find ValveErrorBoundary');
      return;
    }

    this.errorBoundaryPatch = replacePatch(ValveErrorBoundary.prototype, 'render', function (this: any) {
      if (this.state.error) {
        const store = Object.getPrototypeOf(this)?.constructor?.sm_ErrorReportingStore || errorReportingStore;
        return (
          <DeckyErrorBoundary
            error={this.state.error}
            errorKey={this.props.errorKey}
            identifier={`${store.product}_${store.version}_${this.state.identifierHash}`}
            reset={() => this.Reset()}
          />
        );
      }
      return callOriginal;
    });
  }

  public temporarilyDisableReporting() {
    this.debug('Reporting disabled for 30s due to a non-steam error.');
    if (this.disableReportingTimer) {
      clearTimeout(this.disableReportingTimer);
    }
    this.disableReportingTimer = setTimeout(() => {
      this.debug('Reporting re-enabled after 30s timeout.');
      this.disableReportingTimer = 0;
    }, 30000);
  }

  deinit() {
    this.errorCheckPatch?.unpatch();
    this.errorBoundaryPatch?.unpatch();
  }
}

export default ErrorBoundaryHook;
