import {
  DialogButton,
  Dropdown,
  Focusable,
  QuickAccessTab,
  Router,
  SingleDropdownOption,
  SuspensefulImage,
  staticClasses,
} from 'decky-frontend-lib';
import { FC, useRef, useState } from 'react';

import {
  LegacyStorePlugin,
  StorePlugin,
  StorePluginVersion,
  requestLegacyPluginInstall,
  requestPluginInstall,
} from './Store';

const plugins = window.DeckyPluginLoader?.getPlugins();

interface PluginCardProps {
  plugin: StorePlugin | LegacyStorePlugin;
}

const classNames = (...classes: string[]) => {
  return classes.join(' ');
};

function isLegacyPlugin(plugin: LegacyStorePlugin | StorePlugin): plugin is LegacyStorePlugin {
  return 'artifact' in plugin;
}

function isInstalled(plugin: LegacyStorePlugin | StorePlugin): boolean {
  const name = isLegacyPlugin(plugin) ? plugin.artifact : plugin.name;
  return name in plugins.map((p) => p.name);
}

const PluginCard: FC<PluginCardProps> = ({ plugin }) => {
  const [selectedOption, setSelectedOption] = useState<number>(0);
  const buttonRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <div
      style={{
        padding: '30px',
        paddingTop: '10px',
        paddingBottom: '10px',
      }}
    >
      {/* TODO: abstract this messy focus hackiness into a custom component in lib */}
      <Focusable
        // className="Panel Focusable"
        ref={containerRef}
        onActivate={(_: CustomEvent) => {
          buttonRef.current!.focus();
        }}
        onCancel={(_: CustomEvent) => {
          if (containerRef.current!.querySelectorAll('* :focus').length === 0) {
            Router.NavigateBackOrOpenMenu();
            setTimeout(() => Router.OpenQuickAccessMenu(QuickAccessTab.Decky), 1000);
          } else {
            containerRef.current!.focus();
          }
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#ACB2C924',
          height: 'unset',
          marginBottom: 'unset',
          // boxShadow: var(--gpShadow-Medium);
          scrollSnapAlign: 'start',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <a
            style={{ fontSize: '18pt', padding: '10px' }}
            className={classNames(staticClasses.Text)}
            // onClick={() => Router.NavigateToExternalWeb('https://github.com/' + plugin.artifact)}
          >
            {isLegacyPlugin(plugin) ? (
              <div>
                <span style={{ color: 'grey' }}>{plugin.artifact.split('/')[0]}/</span>
                {plugin.artifact.split('/')[1]}
              </div>
            ) : (
              plugin.name
            )}
          </a>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          <SuspensefulImage
            suspenseWidth="256px"
            style={{
              width: 'auto',
              height: '160px',
            }}
            src={
              isLegacyPlugin(plugin)
                ? `https://cdn.tzatzikiweeb.moe/file/steam-deck-homebrew/artifact_images/${plugin.artifact.replace(
                    '/',
                    '_',
                  )}.png`
                : `https://cdn.tzatzikiweeb.moe/file/steam-deck-homebrew/artifact_images/${plugin.name.replace(
                    '/',
                    '_',
                  )}.png`
            }
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <p className={classNames(staticClasses.PanelSectionRow)}>
              <span>Author: {plugin.author}</span>
            </p>
            <p className={classNames(staticClasses.PanelSectionRow)}>
              <span>Tags:</span>
              {plugin.tags.map((tag: string) => (
                <span
                  style={{
                    padding: '5px',
                    marginRight: '10px',
                    borderRadius: '5px',
                    background: tag == 'root' ? '#842029' : '#ACB2C947',
                  }}
                >
                  {tag == 'root' ? 'Requires root' : tag}
                </span>
              ))}
              {isLegacyPlugin(plugin) && (
                <span
                  style={{
                    padding: '5px',
                    marginRight: '10px',
                    borderRadius: '5px',
                    background: '#ACB2C947',
                  }}
                >
                  legacy
                </span>
              )}
            </p>
          </div>
        </div>
        <div
          style={{
            width: '100%',
            alignSelf: 'flex-end',
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          <Focusable
            style={{
              display: 'flex',
              flexDirection: 'row',
              width: '100%',
            }}
          >
            <div
              style={{
                flex: '1',
              }}
            >
              <DialogButton
                ref={buttonRef}
                onClick={() =>
                  isInstalled(plugin)
                    ? window.DeckyPluginLoader.uninstall_plugin(isLegacyPlugin(plugin) ? plugin.artifact : plugin.name)
                    : isLegacyPlugin(plugin)
                    ? requestLegacyPluginInstall(plugin, Object.keys(plugin.versions)[selectedOption])
                    : requestPluginInstall(plugin, plugin.versions[selectedOption])
                }
              >
                {isInstalled(plugin) ? 'Install' : 'Uninstall'}
              </DialogButton>
            </div>
            <div
              style={{
                flex: '0.2',
              }}
            >
              <Dropdown
                rgOptions={
                  (isLegacyPlugin(plugin)
                    ? Object.keys(plugin.versions).map((v, k) => ({
                        data: k,
                        label: v,
                      }))
                    : plugin.versions.map((version: StorePluginVersion, index) => ({
                        data: index,
                        label: version.name,
                      }))) as SingleDropdownOption[]
                }
                strDefaultLabel={'Select a version'}
                selectedOption={selectedOption}
                onChange={({ data }) => setSelectedOption(data)}
              />
            </div>
          </Focusable>
        </div>
      </Focusable>
    </div>
  );
};

export default PluginCard;
