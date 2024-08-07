// THIS FILE MUST BE ENTIRELY SELF-CONTAINED! DO NOT USE PACKAGES!
interface Window {
  FocusNavController: any;
  GamepadNavTree: any;
  deckyFallbackLoaded?: boolean;
}

(async () => {
  try {
    if (window.deckyFallbackLoaded) return;
    window.deckyFallbackLoaded = true;

    // #region utils
    function sleep(ms: number) {
      return new Promise((res) => setTimeout(res, ms));
    }
    // #endregion

    // #region DeckyIcon
    const fallbackIcon = `
      <svg class="fallbackDeckyIcon" xmlns="http://www.w3.org/2000/svg" height="100%" width="100%" viewBox="0 0 512 456">
        <g>
          <path
            style="fill: none;"
            d="M154.33,72.51v49.79c11.78-0.17,23.48,2,34.42,6.39c10.93,4.39,20.89,10.91,29.28,19.18
            c8.39,8.27,15.06,18.13,19.61,29c4.55,10.87,6.89,22.54,6.89,34.32c0,11.78-2.34,23.45-6.89,34.32
            c-4.55,10.87-11.21,20.73-19.61,29c-8.39,8.27-18.35,14.79-29.28,19.18c-10.94,4.39-22.63,6.56-34.42,6.39v49.77
            c36.78,0,72.05-14.61,98.05-40.62c26-26.01,40.61-61.28,40.61-98.05c0-36.78-14.61-72.05-40.61-98.05
            C226.38,87.12,191.11,72.51,154.33,72.51z"
          />

          <ellipse
            transform="matrix(0.982 -0.1891 0.1891 0.982 -37.1795 32.9988)"
            style="fill: none;"
            cx="154.33"
            cy="211.33"
            rx="69.33"
            ry="69.33"
          />
          <path style="fill: none;" d="M430,97h-52v187h52c7.18,0,13-5.82,13-13V110C443,102.82,437.18,97,430,97z" />
          <path
            style="fill: currentColor;"
            d="M432,27h-54V0H0v361c0,52.47,42.53,95,95,95h188c52.47,0,95-42.53,95-95v-7h54c44.18,0,80-35.82,80-80V107
            C512,62.82,476.18,27,432,27z M85,211.33c0-38.29,31.04-69.33,69.33-69.33c38.29,0,69.33,31.04,69.33,69.33
            c0,38.29-31.04,69.33-69.33,69.33C116.04,280.67,85,249.62,85,211.33z M252.39,309.23c-26.01,26-61.28,40.62-98.05,40.62v-49.77
            c11.78,0.17,23.48-2,34.42-6.39c10.93-4.39,20.89-10.91,29.28-19.18c8.39-8.27,15.06-18.13,19.61-29
            c4.55-10.87,6.89-22.53,6.89-34.32c0-11.78-2.34-23.45-6.89-34.32c-4.55-10.87-11.21-20.73-19.61-29
            c-8.39-8.27-18.35-14.79-29.28-19.18c-10.94-4.39-22.63-6.56-34.42-6.39V72.51c36.78,0,72.05,14.61,98.05,40.61
            c26,26.01,40.61,61.28,40.61,98.05C293,247.96,278.39,283.23,252.39,309.23z M443,271c0,7.18-5.82,13-13,13h-52V97h52
            c7.18,0,13,5.82,13,13V271z"
          />
        </g>
      </svg>
    `;
    // #endregion

    // #region findSP
    // from @decky/ui
    function getFocusNavController(): any {
      return window.GamepadNavTree?.m_context?.m_controller || window.FocusNavController;
    }

    function getGamepadNavigationTrees(): any {
      const focusNav = getFocusNavController();
      const context = focusNav.m_ActiveContext || focusNav.m_LastActiveContext;
      return context?.m_rgGamepadNavigationTrees;
    }

    function findSP(): Window {
      // old (SP as host)
      if (document.title == 'SP') return window;
      // new (SP as popup)
      const navTrees = getGamepadNavigationTrees();
      return navTrees?.find((x: any) => x.m_ID == 'root_1_').Root.Element.ownerDocument.defaultView;
    }
    // #endregion

    const fallbackCSS = `
      .fallbackContainer {
        width: 100vw;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        flex-direction: column;
        z-index: 99999999;
        pointer-events: none;
        position: absolute;
        top: 0;
        left: 0;
        backdrop-filter: blur(8px) brightness(40%);
      }
      .fallbackDeckyIcon {
        width: 96px;
        height: 96px;
        padding-bottom: 1rem;
      }
    `;

    const fallbackHTML = `
      <style>${fallbackCSS}</style>
      ${fallbackIcon}
      <span class="fallbackText">
        <b>A crash loop has been detected and Decky has been disabled for this boot.</b>
        <br>
        <i>Steam will restart in 10 seconds...</i>
      </span>
    `;

    await sleep(4000);

    const win = findSP() || window;

    const container = Object.assign(document.createElement('div'), {
      innerHTML: fallbackHTML,
    });
    container.classList.add('fallbackContainer');

    win.document.body.appendChild(container);

    await sleep(10000);

    SteamClient.User.StartShutdown(false);
  } catch (e) {
    console.error('Error showing fallback!', e);
  }
})();
