import { DeckyState } from './components/DeckyState';
import { getSetting, setSetting } from './utils/settings';

export interface NotificationSettings {
  deckyUpdates: boolean;
  pluginUpdates: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  deckyUpdates: true,
  pluginUpdates: true,
};

/**
 * A Service class for managing the notification settings
 *
 * It's mostly responsible for sending setting updates to the server and keeping the local state in sync.
 */
export class NotificationService {
  constructor(private deckyState: DeckyState) {}

  async init() {
    const notificationSettings = await getSetting<Partial<NotificationSettings>>('notificationSettings', {});

    // Adding a fallback to the default settings to be backwards compatible if we ever add new notification settings
    this.deckyState.setNotificationSettings({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...notificationSettings,
    });
  }

  /**
   * Sends the new notification settings to the server and persists it locally in the decky state
   *
   * @param notificationSettings The new notification settings
   */
  async update(notificationSettings: NotificationSettings) {
    await setSetting('notificationSettings', notificationSettings);
    this.deckyState.setNotificationSettings(notificationSettings);
  }

  /**
   * For a specific event, returns true if a notification should be shown
   *
   * @param event The notification event that should be checked
   * @returns true if the notification should be shown
   */
  shouldNotify(event: keyof NotificationSettings) {
    return this.deckyState.publicState().notificationSettings[event];
  }
}
