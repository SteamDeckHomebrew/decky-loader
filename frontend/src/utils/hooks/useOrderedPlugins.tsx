import { useMemo } from 'react';

import { useDeckyState } from '../../components/DeckyState';
import { useSetting } from './useSetting';

export function useOrderedPlugins() {
  const { plugins } = useDeckyState();
  const [pluginOrder, setPluginOrder] = useSetting<string[]>('plugin-order', []);
  const orderedPlugins = useMemo(() => {
    let pluginIndexes = Object.fromEntries(pluginOrder.map((pluginName, index) => [pluginName, index] as const));
    return plugins.concat().sort((a, b) => {
      if (a.name in pluginIndexes && b.name in pluginIndexes) return pluginIndexes[a.name] - pluginIndexes[b.name];
      if (a.name in pluginIndexes) return -1;
      if (b.name in pluginIndexes) return 1;
      return 0;
    });
  }, [pluginOrder, plugins]);

  return {
    orderedPlugins,
    movePlugin,
  };

  function movePlugin(pluginName: string, target: 'up' | 'top' | 'down' | 'bottom') {
    // get the current plugin order - this includes
    // all plugins that previously did not have a sort order
    // and removed all plugins that have been uninstalled
    const currentPluginOrder = orderedPlugins.map((plugin) => plugin.name);
    const index = currentPluginOrder.indexOf(pluginName);
    if (index == -1) return;
    // remove the plugin
    currentPluginOrder.splice(index, 1);
    // reinsert at new position
    const newPosition =
      target == 'top'
        ? 0
        : target == 'up'
        ? Math.max(index - 1, 0)
        : target == 'down'
        ? Math.min(index + 1, currentPluginOrder.length)
        : currentPluginOrder.length;
    currentPluginOrder.splice(newPosition, 0, pluginName);
    setPluginOrder(currentPluginOrder);
  }
}
