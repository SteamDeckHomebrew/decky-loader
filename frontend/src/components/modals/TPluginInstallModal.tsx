import { FC } from 'react';
import { Translation } from 'react-i18next';

import { InstallType } from '../../plugin';

export enum TranslatedPart {
  TITLE,
  DESC,
  BUTTON_IDLE,
  BUTTON_PROC,
}
interface TPluginInstallModalProps {
  trans_part: TranslatedPart;
  trans_type: number;
  artifact?: string;
  version?: string;
}

const TPluginInstallModal: FC<TPluginInstallModalProps> = ({ trans_part, trans_type, artifact, version }) => {
  return (
    <Translation>
      {(t, {}) => {
        switch (trans_part) {
          case TranslatedPart.TITLE:
            switch (trans_type) {
              case InstallType.INSTALL:
                return <div>{t('PluginInstallModal.install.title', { artifact: artifact })}</div>;
              case InstallType.REINSTALL:
                return <div>{t('PluginInstallModal.reinstall.title', { artifact: artifact })}</div>;
              case InstallType.UPDATE:
                return <div>{t('PluginInstallModal.update.title', { artifact: artifact })}</div>;
              default:
                return null;
            }
          case TranslatedPart.DESC:
            switch (trans_type) {
              case InstallType.INSTALL:
                return (
                  <div>
                    {t('PluginInstallModal.install.desc', {
                      artifact: artifact,
                      version: version,
                    })}
                  </div>
                );
              case InstallType.REINSTALL:
                return (
                  <div>
                    {t('PluginInstallModal.reinstall.desc', {
                      artifact: artifact,
                      version: version,
                    })}
                  </div>
                );
              case InstallType.UPDATE:
                return (
                  <div>
                    {t('PluginInstallModal.update.desc', {
                      artifact: artifact,
                      version: version,
                    })}
                  </div>
                );
              default:
                return null;
            }
          case TranslatedPart.BUTTON_IDLE:
            switch (trans_type) {
              case InstallType.INSTALL:
                return <div>{t('PluginInstallModal.install.button_idle')}</div>;
              case InstallType.REINSTALL:
                return <div>{t('PluginInstallModal.reinstall.button_idle')}</div>;
              case InstallType.UPDATE:
                return <div>{t('PluginInstallModal.update.button_idle')}</div>;
              default:
                return null;
            }
          case TranslatedPart.BUTTON_PROC:
            switch (trans_type) {
              case InstallType.INSTALL:
                return <div>{t('PluginInstallModal.install.button_processing')}</div>;
              case InstallType.REINSTALL:
                return <div>{t('PluginInstallModal.reinstall.button_processing')}</div>;
              case InstallType.UPDATE:
                return <div>{t('PluginInstallModal.update.button_processing')}</div>;
              default:
                return null;
            }
        }
      }}
    </Translation>
  );
};

export default TPluginInstallModal;
