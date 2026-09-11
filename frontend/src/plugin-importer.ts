import { Plugin, PluginLoadType } from './plugin';
import { getPluginDisplayName } from './utils/pluginHelpers';

export interface PluginImportRequest {
  name: string;
  version?: string;
  loadType: PluginLoadType;
  timeoutMS?: number;
}

export interface PluginImportDependencies {
  authToken: string;
  createLegacyPluginAPI: (name: string) => unknown;
  fetch: typeof fetch;
  importESModule: (name: string) => Promise<{ default: () => Plugin }>;
}

export async function loadPlugin(
  request: PluginImportRequest,
  timeoutException: Error,
  dependencies: PluginImportDependencies,
): Promise<Plugin> {
  switch (request.loadType) {
    case PluginLoadType.ESMODULE_V1:
      return loadESModulePlugin(request, timeoutException, dependencies.importESModule);
    case PluginLoadType.LEGACY_EVAL_IIFE:
      return loadLegacyPlugin(request, timeoutException, dependencies);
    default:
      throw new Error(`${getPluginDisplayName(request.name, request.version)} has no defined loadType.`);
  }
}

function isAbortError(error: any): boolean {
  return 'name' in error && error.name === 'AbortError';
}

async function loadESModulePlugin(
  request: PluginImportRequest,
  timeoutException: Error,
  importESModule: PluginImportDependencies['importESModule'],
): Promise<Plugin> {
  if (request.timeoutMS === undefined) return (await importESModule(request.name)).default();

  let rejectTimeout!: (reason: Error) => void;
  const timeoutPromise = new Promise<never>((_, reject) => {
    rejectTimeout = reject;
  });
  const timeout = setTimeout(() => rejectTimeout(timeoutException), request.timeoutMS);
  try {
    const pluginExports = await Promise.race([importESModule(request.name), timeoutPromise]);
    return pluginExports.default();
  } finally {
    clearTimeout(timeout);
  }
}

async function loadLegacyPlugin(
  request: PluginImportRequest,
  timeoutException: Error,
  dependencies: PluginImportDependencies,
): Promise<Plugin> {
  const controller = new AbortController();
  let timeout: number | undefined;
  if (request.timeoutMS !== undefined) timeout = setTimeout(() => controller.abort(), request.timeoutMS);

  try {
    const response = await dependencies.fetch(`http://127.0.0.1:1337/plugins/${request.name}/frontend_bundle`, {
      credentials: 'include',
      headers: { 'X-Decky-Auth': dependencies.authToken },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`${getPluginDisplayName(request.name, request.version)} frontend_bundle not OK`);
    }

    const pluginExport: (serverAPI: unknown) => Plugin = await eval(
      (await response.text()) +
        // Stryker disable next-line StringLiteral: sourceURL only labels evaluated code in developer tools.
        `\n//# sourceURL=decky://decky/legacy_plugin/${encodeURIComponent(request.name)}/index.js`,
    );
    return pluginExport(dependencies.createLegacyPluginAPI(request.name));
  } catch (error: any) {
    throw isAbortError(error) ? timeoutException : error;
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}
