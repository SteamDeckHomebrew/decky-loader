import { Field, ProgressBar } from '@decky/ui';
import { FC } from 'react';

interface PluginInstallProgressProps {
  percentage: number;
  operationText: string | null;
}

const PluginInstallProgress: FC<PluginInstallProgressProps> = ({ percentage, operationText }) => {
  return (
    <div style={{ width: '100%', margin: '16px 0 0' }}>
      <Field bottomSeparator="none" childrenLayout="below" focusable={false} padding="standard">
        <div style={{ width: '100%' }}>
          <div
            style={{
              minHeight: '22px',
              width: '100%',
              textAlign: 'left',
              textTransform: 'uppercase',
            }}
          >
            {operationText}
          </div>
          <ProgressBar focusable={false} nProgress={percentage} />
        </div>
      </Field>
    </div>
  );
};

export default PluginInstallProgress;
