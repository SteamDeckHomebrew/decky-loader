import { DeckyState } from './components/DeckyState';
import { getSetting, setSetting } from './utils/settings';

/**
 * A Service class for managing the state and actions related to the hidden plugins feature
 *
 * It's mostly responsible for sending setting updates to the server and keeping the local state in sync.
 */
export class HiddenPluginsService {
  constructor(private deckyState: DeckyState) {}

  init() {
    getSetting<string[]>('hiddenPlugins', []).then((hiddenPlugins) => {
      this.deckyState.setHiddenPlugins(hiddenPlugins);
    });
  }

  /**
   * Sends the new hidden plugins list to the server and persists it locally in the decky state
   *
   * @param hiddenPlugins The new list of hidden plugins
   */
  async update(hiddenPlugins: string[]) {
    await setSetting('hiddenPlugins', hiddenPlugins);
    this.deckyState.setHiddenPlugins(hiddenPlugins);
  }

  /**
   * Refreshes the state of hidden plugins in the local state
   */
  async invalidate() {
    this.deckyState.setHiddenPlugins(await getSetting('hiddenPlugins', []));
  }
}
