import { Patch, callOriginal, findModuleExport, replacePatch } from '@decky/ui';

import DeckyErrorBoundary from './components/DeckyErrorBoundary';
import Logger from './logger';

declare global {
  interface Window {
    __ERRORBOUNDARY_HOOK_INSTANCE: any;
  }
}

class ErrorBoundaryHook extends Logger {
  private errorBoundaryPatch?: Patch;

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
    Object.defineProperty(Object.getPrototypeOf(errorReportingStore), 'reporting_enabled', {
      get: () => false,
    });
    errorReportingStore.m_bEnabled = false;

    // @ts-ignore
    // window.errorStore = errorReportingStore;

    const ValveErrorBoundary = findModuleExport(
      (e) => e.InstallErrorReportingStore && e?.prototype?.Reset && e?.prototype?.componentDidCatch,
    );
    if (!ValveErrorBoundary) {
      this.error('could not find ValveErrorBoundary');
      return;
    }

    this.errorBoundaryPatch = replacePatch(ValveErrorBoundary.prototype, 'render', function (this: any) {
      if (this.state.error) {
        return (
          <DeckyErrorBoundary error={this.state.error} errorKey={this.state.errorKey} reset={() => this.Reset()} />
        );
      }
      return callOriginal;
    });
  }

  deinit() {
    this.errorBoundaryPatch?.unpatch();
  }
}

export default ErrorBoundaryHook;
