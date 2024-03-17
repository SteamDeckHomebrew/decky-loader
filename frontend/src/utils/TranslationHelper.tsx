import { FC } from 'react';
import { Translation } from 'react-i18next';

import { WarnThirdPartyType } from '../components/modals/WarnThirdParty';
import Logger from '../logger';
import { InstallType } from '../plugin';

export enum TranslationClass {
  PLUGIN_LOADER = 'PluginLoader',
  PLUGIN_INSTALL_MODAL = 'PluginInstallModal',
  DEVELOPER = 'Developer',
  WARN_THIRD_PARTY = 'WarnThirdParty',
}

interface TranslationHelperProps {
  trans_class: TranslationClass;
  trans_text: string;
  i18n_args?: {};
  install_type?: number;
  warn_type?: WarnThirdPartyType;
}

const logger = new Logger('TranslationHelper');

const TranslationHelper: FC<TranslationHelperProps> = ({
  trans_class,
  trans_text,
  i18n_args = null,
  install_type = 0,
  warn_type = WarnThirdPartyType.REPO,
}) => {
  return (
    <Translation>
      {(t, {}) => {
        switch (trans_class) {
          case TranslationClass.PLUGIN_LOADER:
            return i18n_args
              ? t(TranslationClass.PLUGIN_LOADER + '.' + trans_text, i18n_args)
              : t(TranslationClass.PLUGIN_LOADER + '.' + trans_text);
          case TranslationClass.PLUGIN_INSTALL_MODAL:
            switch (install_type) {
              case InstallType.INSTALL:
                return i18n_args
                  ? t(TranslationClass.PLUGIN_INSTALL_MODAL + '.install.' + trans_text, i18n_args)
                  : t(TranslationClass.PLUGIN_INSTALL_MODAL + '.install.' + trans_text);
              case InstallType.REINSTALL:
                return i18n_args
                  ? t(TranslationClass.PLUGIN_INSTALL_MODAL + '.reinstall.' + trans_text, i18n_args)
                  : t(TranslationClass.PLUGIN_INSTALL_MODAL + '.reinstall.' + trans_text);
              case InstallType.UPDATE:
                return i18n_args
                  ? t(TranslationClass.PLUGIN_INSTALL_MODAL + '.update.' + trans_text, i18n_args)
                  : t(TranslationClass.PLUGIN_INSTALL_MODAL + '.update.' + trans_text);
            }
          case TranslationClass.DEVELOPER:
            return i18n_args
              ? t(TranslationClass.DEVELOPER + '.' + trans_text, i18n_args)
              : t(TranslationClass.DEVELOPER + '.' + trans_text);
          //Handle different messages in different class cases
          case TranslationClass.WARN_THIRD_PARTY:
            //Needed only for title and description
            if (!trans_text.startsWith('button')) {
              switch (warn_type) {
                case WarnThirdPartyType.REPO:
                  return i18n_args
                    ? t(TranslationClass.WARN_THIRD_PARTY + '.' + trans_text + '_repo', i18n_args)
                    : t(TranslationClass.WARN_THIRD_PARTY + '.' + trans_text + '_repo');
                case WarnThirdPartyType.ZIP:
                  return i18n_args
                    ? t(TranslationClass.WARN_THIRD_PARTY + '.' + trans_text + '_zip', i18n_args)
                    : t(TranslationClass.WARN_THIRD_PARTY + '.' + trans_text + '_zip');
              }
            } else {
              return i18n_args
                ? t(TranslationClass.WARN_THIRD_PARTY + '.' + trans_text, i18n_args)
                : t(TranslationClass.WARN_THIRD_PARTY + '.' + trans_text);
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
