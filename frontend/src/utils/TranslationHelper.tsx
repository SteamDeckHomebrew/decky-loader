import { FC } from 'react';
import { Translation } from 'react-i18next';

import Logger from '../logger';
import { InstallType } from '../plugin';

export enum TranslationClass {
  PLUGIN_LOADER = 'PluginLoader',
  PLUGIN_INSTALL_MODAL = 'PluginInstallModal',
  DEVELOPER = 'Developer',
}

interface TranslationHelperProps {
  transClass: TranslationClass;
  transText: string;
  i18nArgs?: {};
  installType?: number;
}

const logger = new Logger('TranslationHelper');

const TranslationHelper: FC<TranslationHelperProps> = ({ transClass, transText, i18nArgs = null, installType = 0 }) => {
  return (
    <Translation>
      {(t, {}) => {
        switch (transClass) {
          case TranslationClass.PLUGIN_LOADER:
            return i18nArgs
              ? t(TranslationClass.PLUGIN_LOADER + '.' + transText, i18nArgs)
              : t(TranslationClass.PLUGIN_LOADER + '.' + transText);
          case TranslationClass.PLUGIN_INSTALL_MODAL:
            switch (installType) {
              case InstallType.INSTALL:
                return i18nArgs
                  ? t(TranslationClass.PLUGIN_INSTALL_MODAL + '.install.' + transText, i18nArgs)
                  : t(TranslationClass.PLUGIN_INSTALL_MODAL + '.install.' + transText);
              case InstallType.REINSTALL:
                return i18nArgs
                  ? t(TranslationClass.PLUGIN_INSTALL_MODAL + '.reinstall.' + transText, i18nArgs)
                  : t(TranslationClass.PLUGIN_INSTALL_MODAL + '.reinstall.' + transText);
              case InstallType.UPDATE:
                return i18nArgs
                  ? t(TranslationClass.PLUGIN_INSTALL_MODAL + '.update.' + transText, i18nArgs)
                  : t(TranslationClass.PLUGIN_INSTALL_MODAL + '.update.' + transText);
            }
          case TranslationClass.DEVELOPER:
            return i18nArgs
              ? t(TranslationClass.DEVELOPER + '.' + transText, i18nArgs)
              : t(TranslationClass.DEVELOPER + '.' + transText);
          default:
            logger.error('We should never fall in the default case!');
            return '';
        }
      }}
    </Translation>
  );
};

export default TranslationHelper;
