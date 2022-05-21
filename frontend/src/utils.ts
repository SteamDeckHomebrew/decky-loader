export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function unlockObject(obj: any): any {
  const newObj = {};
  Object.keys(obj).forEach((k) => {
    const desc = Object.getOwnPropertyDescriptor(obj, k);
    desc.configurable = true;
    Object.defineProperty(newObj, k, desc);
  });
  return newObj;
}

export function fakeRenderComponent(fun: Function): any {
  const hooks = window.SP_REACT.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current;

  // TODO: add more hooks

  let oldHooks = {
    useContext: hooks.useContext,
    useCallback: hooks.useCallback,
    useEffect: hooks.useEffect,
    useState: hooks.useState,
  };

  hooks.useCallback = (cb) => cb;
  hooks.useContext = (cb) => cb;
  hooks.useEffect = (cb) => cb();
  hooks.useState = (v) => {
    let val = v;

    return [val, (n) => (val = n)];
  };

  const res = fun();

  Object.assign(hooks, oldHooks);

  return res;
}

export function beforePatch(obj: any, name: string, fnc: Function): void {
  const orig = obj[name];
  obj[name] = function (...args) {
    fnc.call(this, args);
    return orig.call(this, ...args);
  };
  Object.assign(obj[name], orig);
  obj[name].toString = () => orig.toString();
  obj[name].__deckyOrig = orig;
}

export function afterPatch(obj: any, name: string, fnc: Function): void {
  const orig = obj[name];
  obj[name] = function (...args) {
    let ret = orig.apply(...args);
    ret = fnc(ret);
    return ret;
  };
  Object.assign(obj[name], orig);
  obj[name].toString = () => orig.toString();
  obj[name].__deckyOrig = orig;
}

export function replacePatch(obj: any, name: string, fnc: Function): void {
  const orig = obj[name];
  obj[name] = function (...args) {
    const ret = fnc.call(this, args);
    if (ret == 'CALL_ORIGINAL') return orig.call(this, ...args);
    return ret;
  };
  Object.assign(obj[name], orig);
  obj[name].toString = () => orig.toString();
  obj[name].__deckyOrig = orig;
}

// TODO allow one method to be patched and unpatched multiple times independently using IDs in a Map or something
export function unpatch(obj: any, name: any): void {
  obj[name] = obj[name].__deckyOrig;
}
