import { Button, staticClasses } from "decky-frontend-lib";
import React from "react"
import { FaArrowCircleLeft, FaShoppingBag } from "react-icons/fa"

class TitleView extends React.Component<{}, { runningPlugin: string }> {
    constructor() {
        super({});
        this.state = {
            runningPlugin: ""
        }
    }

    componentDidMount() {
        window.__DeckyEvLoop.addEventListener("pluginOpen", (ev) => this.setState({ runningPlugin: ev.data }));
        window.__DeckyEvLoop.addEventListener("pluginClose", (_) => this.setState({ runningPlugin: "" }));
    }

    private openPluginStore() {
        fetch("http://127.0.0.1:1337/methods/open_plugin_store", {method: "POST"})
    }

    render() {
        if (this.state.runningPlugin)
            return <div className={staticClasses.Title}>
                <Button bottomSeparator={false}  onClick={(_) => {
                    window.__DeckyEvLoop.dispatchEvent(new Event("pluginClose"));
                    this.setState({ runningPlugin: "" });
                }}><FaArrowCircleLeft /></Button>
                {this.state.runningPlugin}
            </div>
        else
            return <div className={staticClasses.Title}>
                    Plugins
                    <Button bottomSeparator={false} onClick={ (_) => this.openPluginStore() }><FaShoppingBag /></Button>
                </div>
    }
}

export default TitleView;