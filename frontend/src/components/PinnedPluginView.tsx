import { ErrorBoundary, Focusable, staticClasses } from '@decky/ui';
import { CSSProperties, FC } from 'react';
import { FaPlug } from 'react-icons/fa';

import { useDeckyState } from './DeckyState';
import { useQuickAccessVisible } from './QuickAccessVisibleState';

interface PinnedPluginViewProps {
  name: string;
  iconOnly?: boolean;
}

const titleStyles: CSSProperties = {
  display: 'flex',
  paddingRight: '16px',
  position: 'sticky',
  top: '0px',
};

const PinnedPluginView: FC<PinnedPluginViewProps> = ({ name, iconOnly }) => {
  const { plugins } = useDeckyState();
  const visible = useQuickAccessVisible();
  const plugin = plugins.find((p) => p.name === name);

  if (iconOnly) {
    return <>{plugin?.icon ?? <FaPlug />}</>;
  }

  return (
    <Focusable>
      <Focusable className={staticClasses.Title} style={titleStyles}>
        {plugin?.titleView ?? <div style={{ flex: 0.9 }}>{plugin?.name ?? name}</div>}
      </Focusable>
      <div style={{ height: '100%', paddingTop: '16px' }}>
        <ErrorBoundary>{plugin?.content && (visible || plugin.alwaysRender) && plugin.content}</ErrorBoundary>
      </div>
    </Focusable>
  );
};

export default PinnedPluginView;
