import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEyeSlash, FaLock } from 'react-icons/fa';

import { StorePluginVersion } from '../../../../store';
import NotificationBadge from '../../../NotificationBadge';

interface PluginListLabelProps {
  frozen: boolean;
  hidden: boolean;
  name: string;
  version?: string;
  update: StorePluginVersion | undefined;
}

const PluginListLabel: FC<PluginListLabelProps> = ({ name, frozen, hidden, version, update }) => {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div
        style={{
          // needed for NotificationBadge
          position: 'relative',
        }}
      >
        {name}
        {version && (
          <>
            {' - '}
            <span style={{ color: frozen ? '#67707b' : 'inherit' }}>
              {frozen && (
                <>
                  <FaLock />{' '}
                </>
              )}
              {version}
            </span>
          </>
        )}
        <NotificationBadge show={!!update} style={{ top: '-5px', right: '-10px' }} />
      </div>
      {hidden && (
        <div
          style={{
            fontSize: '0.8rem',
            color: '#dcdedf',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <FaEyeSlash />
          {t('PluginListLabel.hidden')}
        </div>
      )}
    </div>
  );
};

export default PluginListLabel;
