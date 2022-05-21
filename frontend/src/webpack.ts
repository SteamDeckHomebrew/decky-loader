declare global {
  interface Window {
    webpackJsonp: any;
    SP_REACT: any;
    SP_REACTDOM: any;
  }
}

export let wpRequire = window.webpackJsonp.push([
  [],
  { get_require: (mod, _exports, wpRequire) => (mod.exports = wpRequire) },
  [['get_require']],
]);
export let all = () =>
  Object.keys(wpRequire.c)
    .map((x) => wpRequire.c[x].exports)
    .filter((x) => x);
export let allRaw = () =>
  Object.keys(wpRequire.c)
    .map((x) => wpRequire.c[x])
    .filter((x) => x);

// Common modules.
// TODO: export these in their own file
// TODO: only call all() once
// TODO: find a way to remove initModules mess

export let Router;
export function initModules() {
  Router = all()
    .map((m) => {
      if (typeof m !== 'object') return undefined;
      for (let prop in m) {
        if (m[prop]?.Navigate && m[prop]?.NavigationManager) return m[prop];
      }
    })
    .find((x) => x);
}
