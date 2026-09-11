import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginLoadType } from './plugin';
import { PluginImportDependencies, PluginImportRequest, loadPlugin } from './plugin-importer';

vi.hoisted(() => {
  Object.assign(globalThis, {
    DeckyBackend: { callable: vi.fn(() => vi.fn()) },
  });
});

const plugin = { name: 'module-export', icon: null as any, content: null as any };
const timeoutException = new Error('timed out');

const createDependencies = (): PluginImportDependencies => ({
  authToken: 'secret',
  createLegacyPluginAPI: vi.fn(() => ({ legacy: true })),
  fetch: vi.fn(),
  importESModule: vi.fn(),
});

const request = (overrides: Partial<PluginImportRequest> = {}): PluginImportRequest => ({
  name: 'Example Plugin',
  version: '1.2.3',
  loadType: PluginLoadType.ESMODULE_V1,
  ...overrides,
});

describe('loadPlugin', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('loads an ES module without installing a timeout', async () => {
    const dependencies = createDependencies();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    vi.mocked(dependencies.importESModule).mockResolvedValue({ default: () => plugin });

    await expect(loadPlugin(request(), timeoutException, dependencies)).resolves.toBe(plugin);

    expect(dependencies.importESModule).toHaveBeenCalledWith('Example Plugin');
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(clearTimeoutSpy).not.toHaveBeenCalled();
  });

  it('loads an ES module before its timeout and clears the timer', async () => {
    vi.useFakeTimers();
    const dependencies = createDependencies();
    vi.mocked(dependencies.importESModule).mockResolvedValue({ default: () => plugin });

    await expect(loadPlugin(request({ timeoutMS: 50 }), timeoutException, dependencies)).resolves.toBe(plugin);

    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects an ES module that exceeds its timeout and clears the timer', async () => {
    vi.useFakeTimers();
    const dependencies = createDependencies();
    vi.mocked(dependencies.importESModule).mockReturnValue(new Promise(() => undefined));

    const result = loadPlugin(request({ timeoutMS: 50 }), timeoutException, dependencies);
    const expectation = expect(result).rejects.toBe(timeoutException);
    await vi.advanceTimersByTimeAsync(50);

    await expectation;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('loads a legacy plugin with its API and authenticated request', async () => {
    const dependencies = createDependencies();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    vi.mocked(dependencies.fetch).mockResolvedValue({
      ok: true,
      text: async () => '(api) => ({ icon: null, api })',
    } as Response);

    await expect(
      loadPlugin(request({ loadType: PluginLoadType.LEGACY_EVAL_IIFE }), timeoutException, dependencies),
    ).resolves.toEqual({ icon: null, api: { legacy: true } });

    expect(dependencies.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:1337/plugins/Example Plugin/frontend_bundle',
      expect.objectContaining({
        credentials: 'include',
        headers: { 'X-Decky-Auth': 'secret' },
        signal: expect.any(AbortSignal),
      }),
    );
    expect(dependencies.createLegacyPluginAPI).toHaveBeenCalledWith('Example Plugin');
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(clearTimeoutSpy).not.toHaveBeenCalled();
  });

  it('clears a legacy timeout after a successful response', async () => {
    vi.useFakeTimers();
    const dependencies = createDependencies();
    vi.mocked(dependencies.fetch).mockResolvedValue({
      ok: true,
      text: async () => '() => ({ icon: null })',
    } as Response);

    await loadPlugin(
      request({ loadType: PluginLoadType.LEGACY_EVAL_IIFE, timeoutMS: 50 }),
      timeoutException,
      dependencies,
    );

    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports a failed legacy response with plugin identity', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.fetch).mockResolvedValue({ ok: false } as Response);

    await expect(
      loadPlugin(request({ loadType: PluginLoadType.LEGACY_EVAL_IIFE }), timeoutException, dependencies),
    ).rejects.toThrow('Example Plugin (v1.2.3) frontend_bundle not OK');
  });

  it('maps an aborted legacy request to the shared timeout error', async () => {
    vi.useFakeTimers();
    const dependencies = createDependencies();
    vi.mocked(dependencies.fetch).mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    });

    const result = loadPlugin(
      request({ loadType: PluginLoadType.LEGACY_EVAL_IIFE, timeoutMS: 50 }),
      timeoutException,
      dependencies,
    );
    const expectation = expect(result).rejects.toBe(timeoutException);
    await vi.advanceTimersByTimeAsync(50);

    await expectation;
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([undefined, 50])('preserves an external abort with timeout %s', async (timeoutMS) => {
    vi.useFakeTimers();
    const dependencies = createDependencies();
    const externalAbort = new DOMException('externally aborted', 'AbortError');
    vi.mocked(dependencies.fetch).mockRejectedValue(externalAbort);

    await expect(
      loadPlugin(request({ loadType: PluginLoadType.LEGACY_EVAL_IIFE, timeoutMS }), timeoutException, dependencies),
    ).rejects.toBe(externalAbort);

    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([new Error('network failed'), { name: 'NetworkError' }, { reason: 'offline' }, null, 'offline', 503])(
    'preserves a non-abort rejection after the timeout fires %#',
    async (failure) => {
      vi.useFakeTimers();
      const dependencies = createDependencies();
      vi.mocked(dependencies.fetch).mockImplementation((_url, init) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(failure));
        });
      });

      const result = loadPlugin(
        request({ loadType: PluginLoadType.LEGACY_EVAL_IIFE, timeoutMS: 50 }),
        timeoutException,
        dependencies,
      );
      const expectation = expect(result).rejects.toBe(failure);
      await vi.advanceTimersByTimeAsync(50);

      await expectation;
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each([new Error('network failed'), { reason: 'offline' }, null, 'offline', 503])(
    'preserves non-timeout legacy failures %#',
    async (failure) => {
      const dependencies = createDependencies();
      vi.mocked(dependencies.fetch).mockRejectedValue(failure);

      await expect(
        loadPlugin(request({ loadType: PluginLoadType.LEGACY_EVAL_IIFE }), timeoutException, dependencies),
      ).rejects.toBe(failure);
    },
  );

  it('rejects unsupported load types', async () => {
    const dependencies = createDependencies();

    await expect(
      loadPlugin(request({ loadType: 99 as PluginLoadType }), timeoutException, dependencies),
    ).rejects.toThrow('Example Plugin (v1.2.3) has no defined loadType.');
  });
});
