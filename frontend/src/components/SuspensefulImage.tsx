import { Spinner } from 'decky-frontend-lib';
import { useEffect } from 'react';
import { FC, ImgHTMLAttributes, useState } from 'react';

interface SuspensefulImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  suspenseWidth?: string | number;
  suspenseHeight?: string | number;
}

const SuspensefulImage: FC<SuspensefulImageProps> = (props) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = props.src || '';
    img.addEventListener('load', () => {
      setLoading(false);
    });
    img.addEventListener('error', () => {
      setError(true);
    });
  }, []);

  return loading ? (
    <div
      style={{
        width: props.suspenseWidth || props.style?.width,
        height: props.suspenseHeight || props.style?.height,
        background: 'rgba(255, 255, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {error ? 'Missing image' : <Spinner style={{ height: '48px' }} />}
    </div>
  ) : (
    <img {...props} />
  );
};

export default SuspensefulImage;
