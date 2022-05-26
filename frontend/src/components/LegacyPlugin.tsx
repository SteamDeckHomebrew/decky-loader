import React from "react"

class LegacyPlugin extends React.Component {
    constructor(props: object) {
        super(props);
    }

    render() {
        return <iframe style={{ border: 'none', width: '100%', height: '100%' }} src={this.props.url}></iframe>
    }
}

export default LegacyPlugin;