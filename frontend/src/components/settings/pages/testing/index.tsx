import {
  DialogBody,
  DialogButton,
  DialogControlsSection,
  Focusable,
  Navigation,
} from 'decky-frontend-lib';
import { useState, useEffect } from 'react';
import { FaDownload, FaInfo } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

interface TestingVersion {
  id: number;
  name: string;
  link: string;
}

export default function PluginList() {
  const { t } = useTranslation();

  const [testingVersions, setTestingVersions] = useState<TestingVersion[]>([])

  useEffect(() => {
    setTestingVersions([
      {id:479,name:"Add notification settings, which allows muting decky/plugin toast notifications", link:"https://github.com/SteamDeckHomebrew/decky-loader/pull/479"},
      {id:454,name:"[Feature] File picker improvements",link:"https://github.com/SteamDeckHomebrew/decky-loader/pull/454"},
      {id:432,name:"[RFC] Add info/docs page for each plugin",link:"https://github.com/SteamDeckHomebrew/decky-loader/pull/432"},
      {id:365,name:"Add linting to Python files in CI",link:"https://github.com/SteamDeckHomebrew/decky-loader/pull/365"},
      {id:308,name:"[DO NOT MERGE] Main menu and overlay patching API",link:"https://github.com/SteamDeckHomebrew/decky-loader/pull/308"}
    ]);
    // TODO: check backend for testing versions
  }, []);

  if (testingVersions.length === 0) {
    return (
      <div>
        <p>No open PRs found</p>
      </div>
    );
  }

  return (
    <DialogBody>
      <DialogControlsSection>
        <ul style={{ listStyleType: 'none', padding: '0' }}>
          {testingVersions.map((version) => {
            return (
              <li style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', paddingBottom: '10px' }}>
                <span>
                  {version.name} <span style={{ opacity: '50%' }}>{'#' + version.id }</span>
                </span>
                <Focusable style={{ height: '40px', width: '40%', marginLeft: 'auto', display: 'flex' }}>
                    <DialogButton
                      style={{ height: '40px', minWidth: '60px', marginRight: '10px' }}
                      onClick={() => console.log("download PR: "+ version.id)} // TODO: download the PR
                    >
                      <div style={{ display: 'flex', minWidth: '150px', justifyContent: 'space-between', alignItems: 'center' }}>
                        {t('Testing.download')}
                        <FaDownload style={{ paddingLeft: '1rem' }} />
                      </div>
                    </DialogButton>
                  <DialogButton
                    style={{ height: '40px', minWidth: '60px' }}
                    onClick={() =>  Navigation.NavigateToExternalWeb(version.link)}
                  >
                    <div style={{ display: 'flex', minWidth: '150px', justifyContent: 'space-between', alignItems: 'center' }}>
                        {t('Testing.info')}
                        <FaInfo style={{ paddingLeft: '1rem' }} />
                    </div>
                  </DialogButton>
                </Focusable>
              </li>
            );
          })}
        </ul>
      </DialogControlsSection>
    </DialogBody>
  );
}
