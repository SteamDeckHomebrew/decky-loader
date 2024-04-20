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
  trans_class: TranslationClass;
  trans_text: string;
  i18n_args?: {};
  install_type?: number;
}

const logger = new Logger('TranslationHelper');

const TranslationHelper: FC<TranslationHelperProps> = ({
  trans_class,
  trans_text,
  i18n_args = null,
  install_type = 0,
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
          default:
            logger.error('We should never fall in the default case!');
            return '';
        }
      }}
    </Translation>
  );
};

export default TranslationHelper;
