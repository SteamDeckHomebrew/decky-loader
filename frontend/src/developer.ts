import { findModuleChild } from 'decky-frontend-lib';

import Logger from './logger';
import { getSetting } from './utils/settings';

const logger = new Logger('DeveloperMode');

let removeSettingsObserver: () => void = () => {};

export function setShowValveInternal(show: boolean) {
  const settingsMod = findModuleChild((m) => {
    if (typeof m !== 'object') return undefined;
    for (let prop in m) {
      if (typeof m[prop]?.settings?.bIsValveEmail !== 'undefined') return m[prop];
    }
  });

  if (show) {
    removeSettingsObserver = settingsMod[
      Object.getOwnPropertySymbols(settingsMod).find((x) => x.toString() == 'Symbol(mobx administration)') as any
    ].observe((e: any) => {
      e.newValue.bIsValveEmail = true;
    });
    settingsMod.m_Settings.bIsValveEmail = true;
    logger.log('Enabled Valve Internal menu');
  } else {
    removeSettingsObserver();
    settingsMod.m_Settings.bIsValveEmail = false;
    logger.log('Disabled Valve Internal menu');
  }
}

export async function startup() {
  const isValveInternalEnabled = await getSetting('developer.valve_internal', false);

  if (isValveInternalEnabled) setShowValveInternal(isValveInternalEnabled);
}
