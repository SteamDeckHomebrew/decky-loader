import Logger from '../logger';

const logger = new Logger('CEFSocketFix');

const closeCEFSocket = DeckyBackend.callable<[], void>('utilities/close_cef_socket');

export default function cefSocketFix() {
  const reg = window.SteamClient?.User?.RegisterForShutdownStart(async () => {
    logger.log('Closing CEF socket before shutdown');
    await closeCEFSocket();
  });

  if (reg) logger.debug('CEF shutdown handler ready');

  return () => reg?.unregister();
}
