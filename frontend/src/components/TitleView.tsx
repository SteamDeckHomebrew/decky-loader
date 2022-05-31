import { staticClasses } from 'decky-frontend-lib';
import { VFC } from 'react';

import { useDeckyState } from './DeckyState';

const TitleView: VFC = () => {
  const { activePlugin } = useDeckyState();

  if (activePlugin === null) {
    return <div className={staticClasses.Title}>Decky</div>;
  }

  return (
    <div className={staticClasses.Title} style={{ paddingLeft: '60px' }}>
      {activePlugin.name}
    </div>
  );
};

export default TitleView;
