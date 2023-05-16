import {
  ControlsList,
  DialogBody,
  DialogButton,
  DialogControlsSection,
  DialogFooter,
  Dropdown,
  Focusable,
  Marquee,
  SteamSpinner,
  TextField,
  ToggleField,
} from 'decky-frontend-lib';
import { filesize } from 'filesize';
import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import { FileIcon, defaultStyles } from 'react-file-icon';
import { useTranslation } from 'react-i18next';
import { FaArrowUp, FaFolder } from 'react-icons/fa';

import Logger from '../../../logger';
import DropdownMultiselect from '../DropdownMultiselect';
import FilePickerError, { FileErrorTypes } from './FilePickerError';
import TSortOption, { SortOptions } from './i18n/TSortOptions';
import { styleDefObj } from './iconCustomizations';

const logger = new Logger('FilePicker');

export interface FilePickerProps {
  startPath: string;
  includeFiles?: boolean;
  filter?: RegExp | ((file: File) => boolean);
  validFileExtensions?: string[];
  allowAllFiles?: boolean;
  defaultHidden?: boolean;
  onSubmit: (val: { path: string; realpath: string }) => void;
  closeModal?: () => void;
}

export interface File {
  isdir: boolean;
  ishidden: boolean;
  name: string;
  realpath: string;
  size: number;
  modified: number;
  created: number;
}

interface FileListing {
  realpath: string;
  files: File[];
}

const sortOptions = [
  {
    data: 'name_desc',
    label: <TSortOption trans_part={SortOptions.name_desc} />,
  },
  {
    data: 'name_asc',
    label: <TSortOption trans_part={SortOptions.name_asc} />,
  },
  {
    data: 'modified_desc',
    label: <TSortOption trans_part={SortOptions.modified_desc} />,
  },
  {
    data: 'modified_asc',
    label: <TSortOption trans_part={SortOptions.modified_asc} />,
  },
  {
    data: 'created_desc',
    label: <TSortOption trans_part={SortOptions.created_desc} />,
  },
  {
    data: 'created_asc',
    label: <TSortOption trans_part={SortOptions.created_asc} />,
  },
  {
    data: 'size_desc',
    label: <TSortOption trans_part={SortOptions.size_desc} />,
  },
  {
    data: 'size_asc',
    label: <TSortOption trans_part={SortOptions.size_asc} />,
  },
];

function getList(path: string, includeFiles: boolean): Promise<{ result: FileListing | string; success: boolean }> {
  return window.DeckyPluginLoader.callServerMethod('filepicker_ls', { path, include_files: includeFiles });
}

const iconStyles = {
  paddingRight: '10px',
  width: '1em',
};

const FilePicker: FunctionComponent<FilePickerProps> = ({
  startPath,
  includeFiles = true,
  filter,
  validFileExtensions = null,
  allowAllFiles = true,
  defaultHidden = false, // false by default makes sense for most users
  onSubmit,
  closeModal,
}) => {
  const { t } = useTranslation();

  if (startPath !== '/' && startPath.endsWith('/')) startPath = startPath.substring(0, startPath.length - 1); // remove trailing path
  const [path, setPath] = useState<string>(startPath);
  const [listing, setListing] = useState<FileListing>({ files: [], realpath: path });
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<FileErrorTypes>(FileErrorTypes.None);
  const [rawError, setRawError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showHidden, setShowHidden] = useState<boolean>(defaultHidden);
  const [sort, setSort] = useState<SortOptions>(SortOptions.name_desc);
  const [selectedFiles, setSelectedFiles] = useState<any>(validFileExtensions);

  const validExtsOptions = useMemo(() => {
    let validExt: { label: string; value: string }[] = [];
    if (!validFileExtensions) return validExt;
    if (allowAllFiles) {
      validExt.push({ label: t('FilePickerIndex.files.all_files'), value: 'all_files' });
    }
    validExt.push(...validFileExtensions.map((x) => ({ label: x, value: x })));
    return validExt;
  }, [validFileExtensions, allowAllFiles]);

  const handleExtsSelect = useCallback((val: any) => {
    // unselect other options if "All Files" is checked
    if (val.includes('all_files')) {
      setSelectedFiles(['all_files']);
    } else {
      setSelectedFiles(val);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const listing = await getList(path, includeFiles);
      if (!listing.success) {
        setListing({ files: [], realpath: path });
        setLoading(false);
        const theError = listing.result as string;
        switch (theError) {
          case theError.match(/\[Errno\s2.*/i)?.input:
            setError(FileErrorTypes.FileNotFound);
            break;
          default:
            setRawError(theError);
            setError(FileErrorTypes.Unknown);
            break;
        }
        logger.error(theError);
        return;
      } else {
        setRawError(null);
        setError(FileErrorTypes.None);
        setFiles((listing.result as FileListing).files);
      }
      setLoading(false);
      setListing(listing.result as FileListing);
      logger.log('reloaded', path, listing);
    })();
  }, [includeFiles, path]);

  useEffect(() => {
    const files = [...listing.files]
      // Hidden files filter
      .filter((file) => {
        if (showHidden && file.ishidden) return true;
        if (!showHidden && file.ishidden) return false;
        return true;
      })
      // File extension filter
      .filter((file) => {
        if (!validFileExtensions || file.isdir || selectedFiles.includes('all_files')) return true;

        const extension = file.realpath.split('.').pop() as string;
        if (selectedFiles.includes(extension)) return true;
        return false;
      })
      // Custom filter
      .filter((file) => {
        if (filter instanceof RegExp) return filter.test(file.name);
        if (typeof filter === 'function') return filter(file);
        return true;
      })
      // Sort files
      .sort((a, b) => {
        const key = sort.split('_')[0];
        const order = sort.split('_')[1];
        if (key === 'name') {
          return order === 'asc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
        }
        return order === 'asc' ? (a[key] > b[key] ? 1 : -1) : b[key] > a[key] ? 1 : -1;
      })
      // Put directories before files
      .reduceRight((acc, file) => (file.isdir ? [file, ...acc] : [...acc, file]), [] as File[]);
    setFiles(files);
  }, [listing.files, filter, showHidden, sort, selectedFiles, validFileExtensions, error]);
  return (
    <>
      <DialogBody className="deckyFilePicker">
        <DialogControlsSection>
          <Focusable flow-children="right" style={{ display: 'flex', marginBottom: '1em' }}>
            <DialogButton
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 'unset',
                width: '40px',
                borderRadius: 'unset',
                margin: '0',
                padding: '10px',
              }}
              onClick={() => {
                const newPathArr = path.split('/');
                newPathArr.pop();
                let newPath = newPathArr.join('/');
                if (newPath == '') newPath = '/';
                setPath(newPath);
              }}
            >
              <FaArrowUp />
            </DialogButton>
            <div style={{ width: '100%' }}>
              <TextField
                value={path}
                onChange={(e) => {
                  e.target.value && setPath(e.target.value);
                }}
                style={{ height: '100%' }}
              />
            </div>
          </Focusable>
          <ControlsList alignItems="center" spacing="standard">
            <ToggleField
              highlightOnFocus={false}
              label={t('FilePickerIndex.files.show_hidden')}
              bottomSeparator="none"
              checked={showHidden}
              onChange={() => setShowHidden((x) => !x)}
            />
            <Dropdown rgOptions={sortOptions} selectedOption={sort} onChange={(x) => setSort(x.data)} />
            {validFileExtensions && (
              <DropdownMultiselect
                label={t('FilePickerIndex.files.file_type')}
                items={validExtsOptions}
                selected={selectedFiles}
                onSelect={handleExtsSelect}
              />
            )}
          </ControlsList>
        </DialogControlsSection>
        <DialogControlsSection style={{ marginTop: '1em' }}>
          <Focusable
            style={{ display: 'flex', gap: '.25em', flexDirection: 'column', height: '60vh', overflow: 'scroll' }}
          >
            {loading && error === FileErrorTypes.None && <SteamSpinner style={{ height: '100%' }} />}
            {!loading &&
              files.map((file) => {
                const extension = file.realpath.split('.').pop() as string;
                return (
                  <DialogButton
                    key={`${file.realpath}${file.name}`}
                    style={{ borderRadius: 'unset', margin: '0', padding: '10px' }}
                    onClick={() => {
                      const fullPath = `${path}${path.endsWith('/') ? '' : '/'}${file.name}`;
                      if (file.isdir) setPath(fullPath);
                      else {
                        onSubmit({ path: fullPath, realpath: file.realpath });
                        closeModal?.();
                      }
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
                      {file.isdir ? (
                        <FaFolder style={iconStyles} />
                      ) : (
                        <div style={iconStyles}>
                          {file.realpath.includes('.') ? (
                            <FileIcon {...defaultStyles[extension]} {...styleDefObj[extension]} extension={''} />
                          ) : (
                            <FileIcon />
                          )}
                        </div>
                      )}
                      <Marquee>{file.name}</Marquee>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        opacity: 0.5,
                        fontSize: '.6em',
                        textAlign: 'left',
                        lineHeight: 1,
                        marginTop: '.5em',
                      }}
                    >
                      {file.isdir ? t('FilePickerIndex.folder.label') : filesize(file.size, { standard: 'iec' })}
                      <span style={{ marginLeft: 'auto' }}>{new Date(file.modified * 1000).toLocaleString()}</span>
                    </div>
                  </DialogButton>
                );
              })}
            {error !== FileErrorTypes.None && <FilePickerError error={error} rawError={rawError ? rawError : ''} />}
          </Focusable>
        </DialogControlsSection>
      </DialogBody>
      {!loading && !error && !includeFiles && (
        <DialogFooter>
          <DialogButton
            className="Primary"
            style={{ marginTop: '10px', alignSelf: 'flex-end' }}
            onClick={() => {
              onSubmit({ path, realpath: listing.realpath });
              closeModal?.();
            }}
          >
            {t('FilePickerIndex.folder.select')}
          </DialogButton>
        </DialogFooter>
      )}
    </>
  );
};

export default FilePicker;
