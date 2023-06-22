import {
  DialogBody,
  DialogButton,
  DialogControlsSection,
  DialogControlsSectionHeader,
  Field,
  Navigation,
  TextField,
  Toggle,
} from 'decky-frontend-lib';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileArchive, FaLink, FaReact, FaSteamSymbol, FaTerminal } from 'react-icons/fa';

import { setShouldConnectToReactDevTools, setShowValveInternal } from '../../../../developer';
import Logger from '../../../../logger';
import { installFromURL } from '../../../../store';
import { useSetting } from '../../../../utils/hooks/useSetting';
import { getSetting } from '../../../../utils/settings';
import { FileSelectionType } from '../../../modals/filepicker';
import RemoteDebuggingSettings from '../general/RemoteDebugging';

const logger = new Logger('DeveloperIndex');

const installFromZip = async () => {
  const path = await getSetting<string>('user_info.user_home', '');
  if (path === '') {
    logger.error('The default path has not been found!');
    return;
  }
  window.DeckyPluginLoader.openFilePickerV2(
    FileSelectionType.FILE,
    path,
    true,
    true,
    undefined,
    ['zip'],
    false,
    false,
  ).then((val) => {
    const url = `file://${val.path}`;
    console.log(`Installing plugin locally from ${url}`);
    installFromURL(url);
  });
};

export default function DeveloperSettings() {
  const [enableValveInternal, setEnableValveInternal] = useSetting<boolean>('developer.valve_internal', false);
  const [reactDevtoolsEnabled, setReactDevtoolsEnabled] = useSetting<boolean>('developer.rdt.enabled', false);
  const [reactDevtoolsIP, setReactDevtoolsIP] = useSetting<string>('developer.rdt.ip', '');
  const [pluginURL, setPluginURL] = useState('');
  const textRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  return (
    <DialogBody>
      <DialogControlsSection>
        <DialogControlsSectionHeader>
          {t('SettingsDeveloperIndex.third_party_plugins.header')}
        </DialogControlsSectionHeader>
        <Field
          label={t('SettingsDeveloperIndex.third_party_plugins.label_zip')}
          icon={<FaFileArchive style={{ display: 'block' }} />}
        >
          <DialogButton onClick={installFromZip}>
            {t('SettingsDeveloperIndex.third_party_plugins.button_zip')}
          </DialogButton>
        </Field>
        <Field
          label={t('SettingsDeveloperIndex.third_party_plugins.label_url')}
          description={
            <TextField
              label={t('SettingsDeveloperIndex.third_party_plugins.label_desc')}
              value={pluginURL}
              onChange={(e) => setPluginURL(e?.target.value)}
            />
          }
          icon={<FaLink style={{ display: 'block' }} />}
        >
          <DialogButton disabled={pluginURL.length == 0} onClick={() => installFromURL(pluginURL)}>
            {t('SettingsDeveloperIndex.third_party_plugins.button_install')}
          </DialogButton>
        </Field>
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>{t('SettingsDeveloperIndex.header')}</DialogControlsSectionHeader>
        <Field
          label={t('SettingsDeveloperIndex.cef_console.label')}
          description={<span style={{ whiteSpace: 'pre-line' }}>{t('SettingsDeveloperIndex.cef_console.desc')}</span>}
          icon={<FaTerminal style={{ display: 'block' }} />}
        >
          <DialogButton
            onClick={async () => {
              let res = await window.DeckyPluginLoader.callServerMethod('get_tab_id', { name: 'SharedJSContext' });
              if (res.success) {
                Navigation.NavigateToExternalWeb(
                  'localhost:8080/devtools/inspector.html?ws=localhost:8080/devtools/page/' + res.result,
                );
              } else {
                console.error('Unable to find ID for SharedJSContext tab ', res.result);
                Navigation.NavigateToExternalWeb('localhost:8080');
              }
            }}
          >
            {t('SettingsDeveloperIndex.cef_console.button')}
          </DialogButton>
        </Field>
        <RemoteDebuggingSettings />
        <Field
          label={t('SettingsDeveloperIndex.valve_internal.label')}
          description={
            <span style={{ whiteSpace: 'pre-line' }}>
              {t('SettingsDeveloperIndex.valve_internal.desc1')}{' '}
              <span style={{ color: 'red' }}>{t('SettingsDeveloperIndex.valve_internal.desc2')}</span>
            </span>
          }
          icon={<FaSteamSymbol style={{ display: 'block' }} />}
        >
          <Toggle
            value={enableValveInternal}
            onChange={(toggleValue) => {
              setEnableValveInternal(toggleValue);
              setShowValveInternal(toggleValue);
            }}
          />
        </Field>
        <Field
          label={t('SettingsDeveloperIndex.react_devtools.label')}
          description={
            <>
              <span style={{ whiteSpace: 'pre-line' }}>{t('SettingsDeveloperIndex.react_devtools.desc')}</span>
              <br />
              <br />
              <div ref={textRef}>
                <TextField
                  label={t('SettingsDeveloperIndex.react_devtools.ip_label')}
                  value={reactDevtoolsIP}
                  onChange={(e) => setReactDevtoolsIP(e?.target.value)}
                />
              </div>
            </>
          }
          icon={<FaReact style={{ display: 'block' }} />}
        >
          <Toggle
            value={reactDevtoolsEnabled}
            // disabled={reactDevtoolsIP == ''}
            onChange={(toggleValue) => {
              setReactDevtoolsEnabled(toggleValue);
              setShouldConnectToReactDevTools(toggleValue);
            }}
          />
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
}
