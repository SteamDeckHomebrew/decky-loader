import { DeckyState } from './components/DeckyState';
import { PluginUpdateMapping } from './store';
import { getSetting, setSetting } from './utils/settings';

/**
 * A Service class for managing the state and actions related to the frozen plugins feature.
 *
 * It's mostly responsible for sending setting updates to the server and keeping the local state in sync.
 */
export class FrozenPluginService {
  constructor(private deckyState: DeckyState) {}

  init() {
    getSetting<string[]>('frozenPlugins', []).then((frozenPlugins) => {
      this.deckyState.setFrozenPlugins(frozenPlugins);
    });
  }

  /**
   * Sends the new frozen plugins list to the server and persists it locally in the decky state
   *
   * @param frozenPlugins The new list of frozen plugins
   */
  async update(frozenPlugins: string[]) {
    await setSetting('frozenPlugins', frozenPlugins);
    this.deckyState.setFrozenPlugins(frozenPlugins);

    // Remove pending updates for frozen plugins
    const updates = this.deckyState.publicState().updates;

    if (updates) {
      const filteredUpdates = new Map() as PluginUpdateMapping;
      updates.forEach((v, k) => {
        if (!frozenPlugins.includes(k)) {
          filteredUpdates.set(k, v);
        }
      });

      this.deckyState.setUpdates(filteredUpdates);
    }
  }

  /**
   * Refreshes the state of frozen plugins in the local state
   */
  async invalidate() {
    this.deckyState.setFrozenPlugins(await getSetting('frozenPlugins', []));
  }
}
