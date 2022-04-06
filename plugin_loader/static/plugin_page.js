function setPluginName(name) {
    document.getElementById("plugin_title").innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-back" viewBox="0 0 16 16">
        <path d="M0 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2z"/>
    </svg>
    ${name}
    `;
}

function reloadIframe() {
    document.getElementById("plugin_iframe").contentWindow.location.href = "http://127.0.0.1:1337/plugins/iframe";
}

function resolveMethodCall(call_id, result) {
    let iframe = document.getElementById("plugin_iframe").contentWindow;
    iframe.postMessage({'call_id': call_id, 'result': result}, "http://127.0.0.1:1337");
}

(function () {
    const PLUGIN_ICON = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plugin" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M1 8a7 7 0 1 1 2.898 5.673c-.167-.121-.216-.406-.002-.62l1.8-1.8a3.5 3.5 0 0 0 
              4.572-.328l1.414-1.415a.5.5 0 0 0 0-.707l-.707-.707 1.559-1.563a.5.5 0 1 0-.708-.706l-1.559 1.562-1.414-1.414
              1.56-1.562a.5.5 0 1 0-.707-.706l-1.56 1.56-.707-.706a.5.5 0 0 0-.707 0L5.318 5.975a3.5 3.5 0 0 0-.328
              4.571l-1.8 1.8c-.58.58-.62 1.6.121 2.137A8 8 0 1 0 0 8a.5.5 0 0 0 1 0Z"/>
        </svg>
    `;

    function createTitle(text) {
        return `<div id="plugin_title" class="quickaccessmenu_Title_34nl5">${text}</div>`;
    }

    function createPluginList() {
        let pages = document.getElementsByClassName("quickaccessmenu_AllTabContents_2yKG4 quickaccessmenu_Down_3rR0o")[0];
        let pluginPage = pages.children[pages.children.length - 1];
        pluginPage.innerHTML = createTitle("Plugins");

        pluginPage.innerHTML += `<iframe id="plugin_iframe" style="border: none; width: 100%; height: 100%;" src="http://127.0.0.1:1337/plugins/iframe"></iframe>`;
    }

    function inject() {
        let tabs = document.getElementsByClassName("quickaccessmenu_TabContentColumn_2z5NL Panel Focusable")[0];
        tabs.children[tabs.children.length - 1].innerHTML = PLUGIN_ICON;

        createPluginList();
    }

    let injector = setInterval(function () {
        if (document.hasFocus()) {
            inject();
            document.getElementById("plugin_title").onclick = function() {
                reloadIframe();
                document.getElementById("plugin_title").innerText = "Plugins";
            }
            window.onmessage = function(ev) {
                document.getElementById("plugin_title").innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left-square-fill" viewBox="0 0 16 16">
                    <path d="M16 14a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12zm-4.5-6.5H5.707l2.147-2.146a.5.5 0 1 0-.708-.708l-3 3a.5.5 0 0 0 0 .708l3 3a.5.5 0 0 0 .708-.708L5.707 8.5H11.5a.5.5 0 0 0 0-1z"/>
                </svg>
                ${ev.data}
                `;         
            }
            clearInterval(injector);
        }
    }, 100);
})();