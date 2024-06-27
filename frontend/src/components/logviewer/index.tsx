import { DialogBody } from 'decky-frontend-lib';
import { FC, useEffect, useState } from 'react';

import LoggedPlugin from './LoggedPlugin';

const LogViewerPage: FC<{}> = () => {
  const [plugins, setPlugins] = useState([]);
  useEffect(() => {
    window.DeckyPluginLoader.callServerMethod('get_plugins_with_logs').then((plugins) => {
      setPlugins(plugins.result || []);
    });
  }, []);
  return (
    <DialogBody>
      {plugins.map((plugin) => <LoggedPlugin plugin={plugin} />)}
    </DialogBody>
  )
};

export default LogViewerPage;