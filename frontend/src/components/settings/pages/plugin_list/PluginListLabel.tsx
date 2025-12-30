import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBan, FaEyeSlash, FaLock } from 'react-icons/fa';

interface PluginListLabelProps {
  frozen: boolean;
  hidden: boolean;
  disabled: boolean;
  name: string;
  version?: string;
}

const PluginListLabel: FC<PluginListLabelProps> = ({ name, frozen, hidden, version, disabled }) => {
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
      {disabled && (
        <div
          style={{
            fontSize: '0.8rem',
            color: '#dcdedf',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <FaBan />
          {t('PluginListLabel.disabled')}
        </div>
      )}
    </div>
  );
};

export default PluginListLabel;
