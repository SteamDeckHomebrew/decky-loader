import {
  DialogBody,
  DialogButton,
  DialogControlsSection,
  Field,
  Focusable,
  Navigation,
  SteamSpinner,
} from 'decky-frontend-lib';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaInfo } from 'react-icons/fa';

import { setSetting } from '../../../../utils/settings';
import { UpdateBranch } from '../general/BranchSelect';

interface TestingVersion {
  id: number;
  name: string;
  link: string;
  head_sha: string;
}

const getTestingVersions = DeckyBackend.callable<[], TestingVersion[]>('updater/get_testing_versions');
const downloadTestingVersion = DeckyBackend.callable<[pr_id: number, sha: string]>('updater/download_testing_version');

export default function TestingVersionList() {
  const { t } = useTranslation();
  const [testingVersions, setTestingVersions] = useState<TestingVersion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      setTestingVersions(await getTestingVersions());
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <>
        <SteamSpinner>{t('Testing.loading')}</SteamSpinner>
      </>
    );
  }

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
        <h4>{t('Testing.header')}</h4>
        <ul style={{ listStyleType: 'none', padding: '0' }}>
          {testingVersions.map((version) => {
            return (
              <li>
                <Field
                  label={
                    <>
                      {version.name} <span style={{ opacity: '50%' }}>{'#' + version.id}</span>
                    </>
                  }
                >
                  <Focusable style={{ height: '40px', marginLeft: 'auto', display: 'flex' }}>
                    <DialogButton
                      style={{ height: '40px', minWidth: '60px', marginRight: '10px' }}
                      onClick={() => {
                        downloadTestingVersion(version.id, version.head_sha);
                        setSetting('branch', UpdateBranch.Testing);
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          minWidth: '150px',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        {t('Testing.download')}
                        <FaDownload style={{ paddingLeft: '1rem' }} />
                      </div>
                    </DialogButton>
                    <DialogButton
                      style={{
                        height: '40px',
                        width: '40px',
                        padding: '10px 12px',
                        minWidth: '40px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                      onClick={() => Navigation.NavigateToExternalWeb(version.link)}
                    >
                      <FaInfo />
                    </DialogButton>
                  </Focusable>
                </Field>
              </li>
            );
          })}
        </ul>
      </DialogControlsSection>
    </DialogBody>
  );
}
