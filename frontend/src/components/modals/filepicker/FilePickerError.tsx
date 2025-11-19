import { FC, JSX, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconContext } from 'react-icons';
import { FaExclamationTriangle, FaQuestionCircle, FaUserSlash } from 'react-icons/fa';

export enum FileErrorTypes {
  FileNotFound,
  PermissionDenied,
  Unknown,
  None,
}

interface FilePickerErrorProps {
  error: FileErrorTypes;
  rawError?: string;
}

const FilePickerError: FC<FilePickerErrorProps> = ({ error, rawError = null }) => {
  const [icon, setIcon] = useState<JSX.Element>(<FaQuestionCircle />);
  const [text, setText] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    switch (error) {
      case FileErrorTypes.FileNotFound:
        setText(t('FilePickerError.errors.file_not_found'));
        setIcon(<FaExclamationTriangle />);
        break;
      case FileErrorTypes.PermissionDenied:
        setText(t('FilePickerError.errors.perm_denied'));
        setIcon(<FaUserSlash />);
        break;
      case FileErrorTypes.Unknown:
        setText(t('FilePickerError.errors.unknown', { raw_error: rawError }));
        setIcon(<FaQuestionCircle />);
        break;
      case FileErrorTypes.None:
        setText(null);
        setIcon(<div></div>);
        break;
    }
  }, [error]);

  return (
    <>
      <div style={{ paddingTop: '50px', textAlign: 'center', height: '100%' }}>
        <IconContext.Provider value={{ className: 'fileError', size: '128px' }}>
          <div style={{ alignSelf: 'center', alignContent: 'center' }}>{icon}</div>
        </IconContext.Provider>
        <p style={{ height: '32px', paddingTop: '25px', alignSelf: 'flex-start', textAlign: 'center' }}>{text}</p>
      </div>
    </>
  );
};

export default FilePickerError;
