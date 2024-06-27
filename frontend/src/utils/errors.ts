import { ErrorInfo } from 'react';

const pluginErrorRegex = /http:\/\/localhost:1337\/plugins\/([^\/]*)\//;
const pluginSourceMapErrorRegex = /decky:\/\/decky\/plugin\/([^\/]*)\//;
const legacyPluginErrorRegex = /decky:\/\/decky\/legacy_plugin\/([^\/]*)\/index.js/;

export interface ValveReactErrorInfo {
  error: Error;
  info: ErrorInfo;
}

export interface ValveError {
  identifier: string;
  identifierHash: string;
  message: string | [func: string, src: string, line: number, column: number];
}

export type ErrorSource = [source: string, wasPlugin: boolean, shouldReportToValve: boolean];

export function getLikelyErrorSourceFromValveError(error: ValveError): ErrorSource {
  return getLikelyErrorSource(JSON.stringify(error?.message));
}

export function getLikelyErrorSourceFromValveReactError(error: ValveReactErrorInfo): ErrorSource {
  return getLikelyErrorSource(error?.error?.stack + "\n" + error.info.componentStack);
}

export function getLikelyErrorSource(error?: string): ErrorSource {
  const pluginMatch = error?.match(pluginErrorRegex);
  if (pluginMatch) {
    return [decodeURIComponent(pluginMatch[1]), true, false];
  }

  const pluginMatchViaMap = error?.match(pluginSourceMapErrorRegex);
  if (pluginMatchViaMap) {
    return [decodeURIComponent(pluginMatchViaMap[1]), true, false];
  }

  const legacyPluginMatch = error?.match(legacyPluginErrorRegex);
  if (legacyPluginMatch) {
    return [decodeURIComponent(legacyPluginMatch[1]), true, false];
  }

  if (error?.includes('http://localhost:1337/')) {
    return ['the Decky frontend', false, false];
  }
  return ['Steam', false, true];
}
