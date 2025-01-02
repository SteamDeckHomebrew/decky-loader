import { FC } from 'react';
import { Translation } from 'react-i18next';

import Logger from '../logger';

export enum TranslationClass {
  PLUGIN_LOADER = 'PluginLoader',
  DEVELOPER = 'Developer',
}

interface TranslationHelperProps {
  transClass: TranslationClass;
  transText: string;
  i18nArgs?: {};
  installType?: number;
}

const logger = new Logger('TranslationHelper');

const TranslationHelper: FC<TranslationHelperProps> = ({ transClass, transText, i18nArgs = null }) => {
  return (
    <Translation>
      {(t, {}) => {
        switch (transClass) {
          case TranslationClass.PLUGIN_LOADER:
            return i18nArgs
              ? t(TranslationClass.PLUGIN_LOADER + '.' + transText, i18nArgs)
              : t(TranslationClass.PLUGIN_LOADER + '.' + transText);
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
