import {
  DialogButton,
  Dropdown,
  Focusable,
  QuickAccessTab,
  Router,
  SingleDropdownOption,
  SuspensefulImage,
  joinClassNames,
  staticClasses,
} from 'decky-frontend-lib';
import { FC, useRef, useState } from 'react';

import { StorePlugin, StorePluginVersion, requestPluginInstall } from '../../store';

interface PluginCardProps {
  plugin: StorePlugin;
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
        className="deckyStoreCard"
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
        <div className="deckyStoreCardHeader" style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{ fontSize: '18pt', padding: '10px' }}
            className={joinClassNames(staticClasses.Text)}
            // onClick={() => Router.NavigateToExternalWeb('https://github.com/' + plugin.artifact)}
          >
            {plugin.name}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
          }}
          className="deckyStoreCardBody"
        >
          <SuspensefulImage
            className="deckyStoreCardImage"
            suspenseWidth="256px"
            style={{
              width: 'auto',
              height: '160px',
            }}
            src={`https://cdn.tzatzikiweeb.moe/file/steam-deck-homebrew/artifact_images/${plugin.name.replace(
              '/',
              '_',
            )}.png`}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
            className="deckyStoreCardInfo"
          >
            <p
              className={joinClassNames(staticClasses.PanelSectionRow)}
              style={{ marginTop: '0px', marginLeft: '16px' }}
            >
              <span style={{ paddingLeft: '0px' }}>Author: {plugin.author}</span>
            </p>
            <p
              className={joinClassNames(staticClasses.PanelSectionRow)}
              style={{
                marginLeft: '16px',
                marginTop: '0px',
                marginBottom: '0px',
                marginRight: '16px',
              }}
            >
              <span style={{ paddingLeft: '0px' }}>{plugin.description}</span>
            </p>
            <p
              className={joinClassNames('deckyStoreCardTagsContainer', staticClasses.PanelSectionRow)}
              style={{
                padding: '0 16px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '5px 10px',
              }}
            >
              <span style={{ padding: '5px 0' }}>Tags:</span>
              {plugin.tags.map((tag: string) => (
                <span
                  className="deckyStoreCardTag"
                  style={{
                    padding: '5px',
                    borderRadius: '5px',
                    background: tag == 'root' ? '#842029' : '#ACB2C947',
                  }}
                >
                  {tag == 'root' ? 'Requires root' : tag}
                </span>
              ))}
            </p>
          </div>
        </div>
        <div
          className="deckyStoreCardActionsContainer"
          style={{
            width: '100%',
            alignSelf: 'flex-end',
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          <Focusable
            className="deckyStoreCardActions"
            style={{
              display: 'flex',
              flexDirection: 'row',
              width: '100%',
            }}
          >
            <div
              className="deckyStoreCardInstallButtonContainer"
              style={{
                flex: '1',
              }}
            >
              <DialogButton
                className="deckyStoreCardInstallButton"
                ref={buttonRef}
                onClick={() => requestPluginInstall(plugin.name, plugin.versions[selectedOption])}
              >
                Install
              </DialogButton>
            </div>
            <div
              className="deckyStoreCardVersionDropdownContainer"
              style={{
                flex: '0.2',
              }}
            >
              <Dropdown
                rgOptions={
                  plugin.versions.map((version: StorePluginVersion, index) => ({
                    data: index,
                    label: version.name,
                  })) as SingleDropdownOption[]
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
