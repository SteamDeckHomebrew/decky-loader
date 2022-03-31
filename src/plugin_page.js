(function () {
    let plugins = [];

    {{ PLUGINS }}

    const PLUGIN_ICON = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plugin" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M1 8a7 7 0 1 1 2.898 5.673c-.167-.121-.216-.406-.002-.62l1.8-1.8a3.5 3.5 0 0 0 
              4.572-.328l1.414-1.415a.5.5 0 0 0 0-.707l-.707-.707 1.559-1.563a.5.5 0 1 0-.708-.706l-1.559 1.562-1.414-1.414
              1.56-1.562a.5.5 0 1 0-.707-.706l-1.56 1.56-.707-.706a.5.5 0 0 0-.707 0L5.318 5.975a3.5 3.5 0 0 0-.328
              4.571l-1.8 1.8c-.58.58-.62 1.6.121 2.137A8 8 0 1 0 0 8a.5.5 0 0 0 1 0Z"/>
        </svg>
    `;

    function createTitle(text) {
        return `<div class="quickaccessmenu_Title_34nl5">${text}</div>`;
    }

    function createTabGroupPanel(content) {
        return `<div class="quickaccessmenu_TabGroupPanel_1QO7b Panel Focusable">${content}</div>`;
    }

    function createPanelSelection(content) {
        return `<div class="quickaccesscontrols_PanelSection_Ob5uo">${content}</div>`;
    }

    function createPanelSelectionRow(content) {
        return `<div class="quickaccesscontrols_PanelSectionRow_26R5w">${content}</div>`;
    }

    function createButton(text, id) {
        return `
        <div class="basicdialog_Field_ugL9c basicdialog_WithChildrenBelow_1RjOd basicdialog_InlineWrapShiftsChildrenBelow_3a6QZ basicdialog_ExtraPaddingOnChildrenBelow_2-owv basicdialog_StandardPadding_1HrfN basicdialog_HighlightOnFocus_1xh2W Panel Focusable" style="--indent-level:0;">
            <div class="basicdialog_FieldChildren_279n8">
                <button id="${id}" type="button" tabindex="0" class="DialogButton _DialogLayout Secondary basicdialog_Button_1Ievp Focusable">${text}</button>
            </div>    
        </div>
        `;
    }

    function createPluginList() {
        let pages = document.getElementsByClassName("quickaccessmenu_AllTabContents_2yKG4 quickaccessmenu_Down_3rR0o")[0];
        let pluginPage = pages.children[pages.children.length - 1];

        pluginPage.innerHTML = createTitle("Plugins");

        let buttons = "";
        for (let i = 0; i < plugins.length; i++) {
            buttons += createPanelSelectionRow(createButton(plugins[i].getName(), "plugin_btn_" + i))
        }

        pluginPage.innerHTML += createTabGroupPanel(createPanelSelection(buttons));

        for (let i = 0; i < plugins.length; i++) {
            document.getElementById("plugin_btn_" + i).onclick = (function(plugin, pluginPage) {
               return function() {
                   pluginPage.innerHTML = createButton("Back", "plugin_back") + createTitle(plugin.getName()) + createTabGroupPanel(plugin.getPageContent());
                   plugin.runCode();

                   document.getElementById("plugin_back").onclick = (e) => {
                       createPluginList();
                   };
               };
            }(plugins[i], pluginPage))
        }

    }

    function inject() {
        let tabs = document.getElementsByClassName("quickaccessmenu_TabContentColumn_2z5NL Panel Focusable")[0];
        tabs.children[tabs.children.length - 1].innerHTML = PLUGIN_ICON;

        createPluginList();
    }

    let injector = setInterval(function () {
        if (document.hasFocus()) {
            inject();
            clearInterval(injector);
        }
    }, 100);
})();