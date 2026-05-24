import { DeckyState } from './components/DeckyState';
import { getSetting, setSetting } from './utils/settings';

/**
 * A Service class for managing the state and actions related to the pinned plugins feature.
 *
 * It's mostly responsible for sending setting updates to the server and keeping the local state in sync.
 */
export class PinnedPluginsService {
  constructor(private deckyState: DeckyState) {}

  init() {
    getSetting<string[]>('pinnedPlugins', []).then((pinnedPlugins) => {
      this.deckyState.setPinnedPlugins(pinnedPlugins);
    });
  }

  /**
   * Sends the new pinned plugins list to the server and persists it locally in the decky state
   *
   * @param pinnedPlugins The new list of pinned plugins
   */
  async update(pinnedPlugins: string[]) {
    await setSetting('pinnedPlugins', pinnedPlugins);
    this.deckyState.setPinnedPlugins(pinnedPlugins);
  }

  /**
   * Refreshes the state of pinned plugins in the local state
   */
  async invalidate() {
    this.deckyState.setPinnedPlugins(await getSetting('pinnedPlugins', []));
  }
}
