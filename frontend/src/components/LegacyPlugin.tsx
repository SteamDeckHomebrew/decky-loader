import { VFC } from 'react';

interface Props {
  url: string;
}

const LegacyPlugin: VFC<Props> = ({ url }) => {
  return <iframe style={{ border: 'none', width: '100%', height: '100%' }} src={url}></iframe>;
};

export default LegacyPlugin;
