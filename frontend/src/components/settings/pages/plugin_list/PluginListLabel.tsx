import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEyeSlash, FaLock } from 'react-icons/fa';

interface PluginListLabelProps {
  frozen: boolean;
  hidden: boolean;
  name: string;
  version?: string;
}

const PluginListLabel: FC<PluginListLabelProps> = ({ name, frozen, hidden, version }) => {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div>
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
