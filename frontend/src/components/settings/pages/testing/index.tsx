import { DialogBody, DialogButton, DialogControlsSection, Focusable, Navigation } from 'decky-frontend-lib';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaDownload, FaInfo } from 'react-icons/fa';

import { callUpdaterMethod } from '../../../../updater';
import { setSetting } from '../../../../utils/settings';
import { UpdateBranch } from '../general/BranchSelect';

interface TestingVersion {
  id: number;
  name: string;
  link: string;
  head_sha: string;
}

export default function TestingVersionList() {
  const { t } = useTranslation();
  const [testingVersions, setTestingVersions] = useState<TestingVersion[]>([]);

  useEffect(() => {
    (async () => {
      setTestingVersions((await callUpdaterMethod('get_testing_versions')).result);
    })();
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
                  {version.name} <span style={{ opacity: '50%' }}>{'#' + version.id}</span>
                </span>
                <Focusable style={{ height: '40px', marginLeft: 'auto', display: 'flex' }}>
                  <DialogButton
                    style={{ height: '40px', minWidth: '60px', marginRight: '10px' }}
                    onClick={() => {
                      callUpdaterMethod('download_testing_version', { pr_id: version.id, sha_id: version.head_sha });
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
              </li>
            );
          })}
        </ul>
      </DialogControlsSection>
    </DialogBody>
  );
}
