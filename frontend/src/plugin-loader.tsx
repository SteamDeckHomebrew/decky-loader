import Logger from './logger';
import TabsHook from './tabs-hook';
import { FaPlug } from "react-icons/fa";

import PluginView  from "./components/PluginView";
import TitleView from "./components/TitleView";
import LegacyPlugin from "./components/LegacyPlugin"

interface Plugin {
  name: any;
  content: any;
  icon: any;
  onDismount?(): void;
}

declare global {
  interface Window {
    __DeckyEvLoop: PluginEventTarget;
    __DeckyRunningPlugin: string;
  }
}
class PluginEventTarget extends EventTarget { }
window.__DeckyEvLoop = new PluginEventTarget();

class PluginLoader extends Logger {
  private plugins: Plugin[] = [];
  private tabsHook: TabsHook = new TabsHook();

  constructor() {
    super(PluginLoader.name);
    this.log('Initialized');
    this.tabsHook.add({
      id: "main",
      title: <TitleView />,
      content: <PluginView />,
      icon: <FaPlug />
    });
    SteamClient.Input.RegisterForControllerInputMessages(this.handleBack);
    window.__DeckyEvLoop.addEventListener("pluginOpen", (x) => window.__DeckyRunningPlugin = x.data);
    window.__DeckyEvLoop.addEventListener("pluginClose", (_) => window.__DeckyRunningPlugin = "");
  }

  private handleBack(ev) {
    const e = ev[0];
    if (e.strActionName == "B" && window.__DeckyRunningPlugin)
      window.__DeckyEvLoop.dispatchEvent(new Event("pluginClose"));
  }

  public async importPlugin(name: string) {
    this.log(`Trying to load ${name}`);
    let find = this.plugins.find(x => x.name == name);
    if (find) 
      this.plugins.splice(this.plugins.indexOf(find), 1);
    if (name.startsWith("$LEGACY_"))
      this.importLegacyPlugin(name.replace("$LEGACY_", ""));
    else
      this.importReactPlugin(name);
    this.log(`Loaded ${name}`);
    const ev = new Event("setPlugins");
    ev.data = this.plugins;
    window.__DeckyEvLoop.dispatchEvent(ev);
  }

  private async importReactPlugin(name: string) {
    let res = await fetch(`http://127.0.0.1:1337/plugins/${name}/frontend_bundle`);
    if (res.ok) {
      let content = await eval(await res.text())(PluginLoader.createPluginAPI(name));
      this.plugins.push({
        name: name,
        icon: content.icon,
        content: content.content
      });
    }
    else throw new Error(`${name} frontend_bundle not OK`);
  }

  private async importLegacyPlugin(name: string) {
    const url = `http://127.0.0.1:1337/plugins/load_main/${name}`;
    this.plugins.push({
      name: name,
      icon: <FaPlug />,
      content: <LegacyPlugin url={ url } />
    });
  }

  static createPluginAPI(pluginName) {
    return {
      async callServerMethod(methodName, args = {}) {
        const response = await fetch(`http://127.0.0.1:1337/methods/${methodName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(args),
        });

        return response.json();
      },
      async callPluginMethod(methodName, args = {}) {
        const response = await fetch(`http://127.0.0.1:1337/plugins/${pluginName}/methods/${methodName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            args,
          }),
        });

        return response.json();
      },
      fetchNoCors(url, request: any = {}) {
        let args = { method: 'POST', headers: {}, body: '' };
        const req = { ...args, ...request, url, data: request.body };
        return this.callServerMethod('http_request', req);
      },
      executeInTab(tab, runAsync, code) {
        return this.callServerMethod('execute_in_tab', {
          tab,
          run_async: runAsync,
          code,
        });
      },
      injectCssIntoTab(tab, style) {
        return this.callServerMethod('inject_css_into_tab', {
          tab,
          style,
        });
      },
      removeCssFromTab(tab, cssId) {
        return this.callServerMethod('remove_css_from_tab', {
          tab,
          css_id: cssId,
        });
      },
    };
  }
}

export default PluginLoader;