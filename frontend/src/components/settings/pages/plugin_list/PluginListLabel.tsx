import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEyeSlash } from 'react-icons/fa';

interface PluginListLabelProps {
  hidden: boolean;
  name: string;
  version?: string;
}

const PluginListLabel: FC<PluginListLabelProps> = ({ name, hidden, version }) => {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div>{version ? `${name} - ${version}` : name}</div>
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
