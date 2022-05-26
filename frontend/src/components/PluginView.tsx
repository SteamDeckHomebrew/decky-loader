import { Button } from "decky-frontend-lib";
import React from "react"

class PluginView extends React.Component<{}, { runningPlugin: string, plugins: Array<any> }> {
    constructor() {
        super({});
        this.state = {
            plugins: [],
            runningPlugin: ""
        }
    }

    componentDidMount() {
        window.__DeckyEvLoop.addEventListener("pluginClose", (_) => { this.setState({ runningPlugin: "", plugins: this.state.plugins }) });
        window.__DeckyEvLoop.addEventListener("setPlugins", (ev) => { console.log(ev); this.setState({ plugins: ev.data, runningPlugin: this.state.runningPlugin }) });
    }

    private openPlugin(name: string) {
        const ev = new Event("pluginOpen");
        ev.data = name;
        window.__DeckyEvLoop.dispatchEvent(ev);
        this.setState({ runningPlugin: name, plugins: this.state.plugins })
    }

    render() {
        if (this.state.runningPlugin) {
            return this.state.plugins.find(x => x.name == this.state.runningPlugin).content;
        }
        else {
            let buttons = [];
            for (const plugin of this.state.plugins) {
                buttons.push(<Button layout="below" onClick={(_) => this.openPlugin(plugin.name)}>{plugin.icon}{plugin.name}</Button>)
            }
            if (buttons.length == 0) return <div className='staticClasses.Text'>No plugins...</div>;
            return buttons;
        }
    }
}

export default PluginView;