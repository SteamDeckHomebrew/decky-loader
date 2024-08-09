import { FC } from 'react';
import { Translation } from 'react-i18next';

import { WarnThirdPartyType } from './globalTypes';
import Logger from '../logger';
import { InstallType } from '../plugin';

export enum TranslationClass {
  PLUGIN_LOADER = 'PluginLoader',
  PLUGIN_INSTALL_MODAL = 'PluginInstallModal',
  DEVELOPER = 'Developer',
  WARN_THIRD_PARTY = 'WarnThirdParty',
}

interface TranslationHelperProps {
  transClass: TranslationClass;
  transText: string;
  i18nArgs?: {};
  installType?: number;
  warnType?: WarnThirdPartyType;
}

const logger = new Logger('TranslationHelper');

const TranslationHelper: FC<TranslationHelperProps> = ({ transClass, transText, i18nArgs = null, installType = 0, warnType = WarnThirdPartyType.REPO }) => {
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
              //Handle different messages in different class cases
              case TranslationClass.WARN_THIRD_PARTY:
              //Needed only for title and description
              if (!transText.startsWith('button')) {
              switch (warnType) {
              case WarnThirdPartyType.REPO:
                return i18nArgs
                ? t(TranslationClass.WARN_THIRD_PARTY + '.' + transText + '_repo', i18nArgs)
                : t(TranslationClass.WARN_THIRD_PARTY + '.' + transText + '_repo');
              case WarnThirdPartyType.ZIP:
                return i18nArgs
                ? t(TranslationClass.WARN_THIRD_PARTY + '.' + transText + '_zip', i18nArgs)
                : t(TranslationClass.WARN_THIRD_PARTY + '.' + transText + '_zip');
              }
              } else {
              return i18nArgs
              ? t(TranslationClass.WARN_THIRD_PARTY + '.' + transText, i18nArgs)
              : t(TranslationClass.WARN_THIRD_PARTY + '.' + transText);
              }
          default:
            logger.error('We should never fall in the default case!');
            return '';
        }
      }}
    </Translation>
  );
};

export default TranslationHelper;
