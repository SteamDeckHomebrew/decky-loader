import {
  DialogBody,
  DialogButton,
  DialogControlsSection,
  DialogControlsSectionHeader,
  Field,
  TextField,
  Toggle,
} from 'decky-frontend-lib';
import { useRef, useState } from 'react';
import { FaFileArchive, FaLink, FaReact, FaSteamSymbol } from 'react-icons/fa';

import { setShouldConnectToReactDevTools, setShowValveInternal } from '../../../../developer';
import { installFromURL } from '../../../../store';
import { useSetting } from '../../../../utils/hooks/useSetting';
import RemoteDebuggingSettings from '../general/RemoteDebugging';

const installFromZip = () => {
  window.DeckyPluginLoader.openFilePicker('/home/deck', true).then((val) => {
    const url = `file://${val.path}`;
    console.log(`Installing plugin locally from ${url}`);

    if (url.endsWith('.zip')) {
      installFromURL(url);
    } else {
      window.DeckyPluginLoader.toaster.toast({
        title: 'Decky',
        body: `Installation failed! Only ZIP files are supported.`,
        onClick: installFromZip,
      });
    }
  });
};

export default function DeveloperSettings() {
  const [enableValveInternal, setEnableValveInternal] = useSetting<boolean>('developer.valve_internal', false);
  const [reactDevtoolsEnabled, setReactDevtoolsEnabled] = useSetting<boolean>('developer.rdt.enabled', false);
  const [reactDevtoolsIP, setReactDevtoolsIP] = useSetting<string>('developer.rdt.ip', '');
  const [pluginURL, setPluginURL] = useState('');
  const textRef = useRef<HTMLDivElement>(null);

  return (
    <DialogBody>
      <DialogControlsSection>
        <DialogControlsSectionHeader>Third-Party Plugins</DialogControlsSectionHeader>
        <Field label="Install Plugin from ZIP File" icon={<FaFileArchive style={{ display: 'block' }} />}>
          <DialogButton onClick={installFromZip}>Browse</DialogButton>
        </Field>
        <Field
          label="Install Plugin from URL"
          description={<TextField label={'URL'} value={pluginURL} onChange={(e) => setPluginURL(e?.target.value)} />}
          icon={<FaLink style={{ display: 'block' }} />}
        >
          <DialogButton disabled={pluginURL.length == 0} onClick={() => installFromURL(pluginURL)}>
            Install
          </DialogButton>
        </Field>
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>Other</DialogControlsSectionHeader>
        <RemoteDebuggingSettings />
        <Field
          label="Enable Valve Internal"
          description={
            <span style={{ whiteSpace: 'pre-line' }}>
              Enables the Valve internal developer menu.{' '}
              <span style={{ color: 'red' }}>Do not touch anything in this menu unless you know what it does.</span>
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
          label="Enable React DevTools"
          description={
            <>
              <span style={{ whiteSpace: 'pre-line' }}>
                Enables connection to a computer running React DevTools. Changing this setting will reload Steam. Set
                the IP address before enabling.
              </span>
              <br />
              <br />
              <div ref={textRef}>
                <TextField label={'IP'} value={reactDevtoolsIP} onChange={(e) => setReactDevtoolsIP(e?.target.value)} />
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
