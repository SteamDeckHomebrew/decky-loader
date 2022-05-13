import Logger from './logger';
import TabsHook from './tabs-hook';

interface Plugin {
  title: any;
  content: any;
  icon: any;
  onDismount?(): void;
}

class PluginLoader extends Logger {
  private pluginInstances: Record<string, Plugin> = {};
  private tabsHook: TabsHook;
  private lock = 0;

  constructor() {
    super(PluginLoader.name);

    this.log('Initialized');
    this.tabsHook = new TabsHook();
  }

  dismountPlugin(name: string) {
    this.log(`Dismounting ${name}`);
    this.pluginInstances[name]?.onDismount?.();
    delete this.pluginInstances[name];
    this.tabsHook.removeById(name);
  }

  async loadAllPlugins() {
    this.log('Loading all plugins');
    const plugins = await (await fetch(`http://127.0.0.1:1337/plugins`)).json();
    this.log('Received:', plugins);

    return Promise.all(plugins.map((plugin) => this.loadPlugin(plugin.name)));
  }

  async loadPlugin(name) {
    this.log('Loading Plugin:', name);

    try {
      while (this.lock === 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      this.lock = 1;

      if (this.pluginInstances[name]) {
        this.dismountPlugin(name);
      }

      const response = await fetch(`http://127.0.0.1:1337/plugins/${name}/frontend_bundle`);
      const code = await response.text();

      const pluginAPI = PluginLoader.createPluginAPI(name);
      this.pluginInstances[name] = await eval(code)(pluginAPI);

      const { title, icon, content } = this.pluginInstances[name];
      this.tabsHook.add({
        id: name,
        title,
        icon,
        content,
      });
    } catch (e) {
      console.error(e);
    } finally {
      this.lock = 0;
    }
  }

  dismountAll() {
    for (const name of Object.keys(this.pluginInstances)) {
      this.dismountPlugin(name);
    }
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
