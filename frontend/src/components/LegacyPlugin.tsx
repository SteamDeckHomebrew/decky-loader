import { VFC } from 'react';

// class LegacyPlugin extends React.Component {
//     constructor(props: object) {
//         super(props);
//     }

//     render() {
//         return <iframe style={{ border: 'none', width: '100%', height: '100%' }} src={this.props.url}></iframe>
//     }
// }

interface Props {
  url: string;
}

const LegacyPlugin: VFC<Props> = () => {
  return <div>LegacyPlugin Hello World</div>;
};

export default LegacyPlugin;
