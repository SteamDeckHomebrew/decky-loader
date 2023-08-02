import { DeckyState } from './components/DeckyState';
import { getSetting, setSetting } from './utils/settings';

export interface PluginOrder {
  pluginOrder: string[];
}

export const DEFAULT_PLUGIN_ORDER: PluginOrder = {
  pluginOrder: [],
};

/**
 * A Service class for managing the plugin order
 *
 * It's mostly responsible for sending setting updates to the server and keeping the local state in sync.
 */
export class PluginOrderService {
  constructor(private deckyState: DeckyState) {}

  async init() {
    const pluginOrder = await getSetting<Partial<PluginOrder>>('pluginOrder', {});

    // Adding a fallback to the default settings to be backwards compatible if we ever change plugin order logic
    this.deckyState.setPluginOrder({
      ...DEFAULT_PLUGIN_ORDER,
      ...pluginOrder,
    });
  }

  /**
   * Sends the new plugin order to the server and persists it locally in the decky state
   *
   * @param pluginOrder The new plugin order
   */
  async update(pluginOrder: PluginOrder) {
    await setSetting('pluginOrder', pluginOrder);
    this.deckyState.setPluginOrder(pluginOrder);
  }

  /**
   * For a specific event, returns true if a notification should be shown
   *
   * @param event The notification event that should be checked
   * @returns true if the notification should be shown
   */
  shouldNotify(event: keyof PluginOrder) {
    return this.deckyState.publicState().pluginOrder[event];
  }
}
