// Sets up DFL, then loads start.ts which starts up the loader
interface Window {
  SP_REACTDOM: any;
}
(async () => {
  if (!window.SP_REACT) {
    console.debug('Setting up React globals...');
    // deliberate partial import
    const DFLWebpack = await import('decky-frontend-lib/dist/webpack');
    // TODO move these finds to dfl in v4
    window.SP_REACT = DFLWebpack.findModule((m) => m.Component && m.PureComponent && m.useLayoutEffect);
    window.SP_REACTDOM = DFLWebpack.findModule((m) => m.createPortal && m.createRoot);
  }
  console.debug('Setting up decky-frontend-lib...');
  window.DFL = await import('decky-frontend-lib');
  await import('./start');
})();
