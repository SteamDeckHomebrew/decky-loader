import { sleep } from '@decky/ui';
import { FaReact } from 'react-icons/fa';

import Logger from './logger';
import { getSetting } from './utils/settings';
import TranslationHelper, { TranslationClass } from './utils/TranslationHelper';

const logger = new Logger('DeveloperMode');

let removeSettingsObserver: () => void = () => {};

declare global {
  interface Window {
    settingsStore: any;
  }
}

export async function setShowValveInternal(show: boolean) {
  if (show) {
    const mobx =
      window.settingsStore[
        Object.getOwnPropertySymbols(window.settingsStore).find(
          (x) => x.toString() == 'Symbol(mobx administration)',
        ) as any
      ];

    removeSettingsObserver = (mobx.observe_ || mobx.observe).call(mobx, (e: any) => {
      e.newValue.bIsValveEmail = true;
    });

    window.settingsStore.m_Settings.bIsValveEmail = true;
    logger.log('Enabled Valve Internal menu');
  } else {
    removeSettingsObserver();
    window.settingsStore.m_Settings.bIsValveEmail = false;
    logger.log('Disabled Valve Internal menu');
  }
}

export async function setShouldConnectToReactDevTools(enable: boolean) {
  DeckyPluginLoader.toaster.toast({
    title: enable ? (
      <TranslationHelper transClass={TranslationClass.DEVELOPER} transText={'enabling'} />
    ) : (
      <TranslationHelper transClass={TranslationClass.DEVELOPER} transText={'disabling'} />
    ),
    body: <TranslationHelper transClass={TranslationClass.DEVELOPER} transText={'5secreload'} />,
    icon: <FaReact />,
  });
  await sleep(5000);
  return enable ? DeckyBackend.call('utilities/enable_rdt') : DeckyBackend.call('utilities/disable_rdt');
}

export async function startup() {
  const isValveInternalEnabled = await getSetting('developer.valve_internal', false);
  const isRDTEnabled = await getSetting('developer.rdt.enabled', false);

  if (isValveInternalEnabled) setShowValveInternal(isValveInternalEnabled);

  if ((isRDTEnabled && !window.deckyHasConnectedRDT) || (!isRDTEnabled && window.deckyHasConnectedRDT))
    setShouldConnectToReactDevTools(isRDTEnabled);
}
