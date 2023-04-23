import { Component } from 'react';
import { Translation } from 'react-i18next';

import { InstallType } from '../../plugin';

export enum TranslatedPart {
  TITLE,
  DESC,
  BUTTON_IDLE,
  BUTTON_PROC,
}
class TPluginInstallModal extends Component<TranslationProps> {
  public static defaultProps = {
    artifact: '',
    version: '',
  };
  render() {
    return (
      <Translation>
        {(t, {}) => {
          switch (this.props.trans_part) {
            case TranslatedPart.TITLE:
              switch (this.props.trans_type) {
                case InstallType.INSTALL:
                  return <div>{t('PluginInstallModal.install.title', { artifact: this.props.artifact })}</div>;
                case InstallType.REINSTALL:
                  return <div>{t('PluginInstallModal.reinstall.title', { artifact: this.props.artifact })}</div>;
                case InstallType.UPDATE:
                  return <div>{t('PluginInstallModal.update.title', { artifact: this.props.artifact })}</div>;
                default:
                  return null;
              }
            case TranslatedPart.DESC:
              switch (this.props.trans_type) {
                case InstallType.INSTALL:
                  return (
                    <div>
                      {t('PluginInstallModal.install.desc', {
                        artifact: this.props.artifact,
                        version: this.props.version,
                      })}
                    </div>
                  );
                case InstallType.REINSTALL:
                  return (
                    <div>
                      {t('PluginInstallModal.reinstall.desc', {
                        artifact: this.props.artifact,
                        version: this.props.version,
                      })}
                    </div>
                  );
                case InstallType.UPDATE:
                  return (
                    <div>
                      {t('PluginInstallModal.update.desc', {
                        artifact: this.props.artifact,
                        version: this.props.version,
                      })}
                    </div>
                  );
                default:
                  return null;
              }
            case TranslatedPart.BUTTON_IDLE:
              switch (this.props.trans_type) {
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
              switch (this.props.trans_type) {
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
  }
}

interface TranslationProps {
  trans_part: TranslatedPart;
  trans_type: number;
  artifact: string;
  version: string;
}

export default TPluginInstallModal;
