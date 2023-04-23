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

import DropdownMultiselect from '../DropdownMultiselect';
import { styleDefObj } from './iconCustomizations';

export interface FilePickerProps {
  startPath: string;
  includeFiles?: boolean;
  filter?: RegExp | ((file: File) => boolean);
  validFileExtensions?: string[];
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

type SortOption =
  | 'name_desc'
  | 'name_asc'
  | 'modified_desc'
  | 'modified_asc'
  | 'created_desc'
  | 'created_asc'
  | 'size_desc'
  | 'size_asc';

enum ESortOption {
  'name_desc',
  'name_asc',
  'modified_desc',
  'modified_asc',
  'created_desc',
  'created_asc',
  'size_desc',
  'size_asc',
}

function getTextForSortOption(identifier: ESortOption): string {
  const { t } = useTranslation();
  switch (identifier) {
    case ESortOption.name_desc:
      return t('FilePickerIndex.filter.name_desc');
    case ESortOption.name_asc:
      return t('FilePickerIndex.filter.name_asce');
    case ESortOption.modified_desc:
      return t('FilePickerIndex.filter.modified_desc');
    case ESortOption.modified_asc:
      return t('FilePickerIndex.filter.modified_asce');
    case ESortOption.created_desc:
      return t('FilePickerIndex.filter.created_desc');
    case ESortOption.created_asc:
      return t('FilePickerIndex.filter.created_asce');
    case ESortOption.size_desc:
      return t('FilePickerIndex.filter.size_desc');
    case ESortOption.size_asc:
      return t('FilePickerIndex.filter.size_asce');
  }
}

const sortOptions = [
  {
    data: 'name_desc',
    label: getTextForSortOption(ESortOption.name_desc),
  },
  {
    data: 'name_asc',
    label: getTextForSortOption(ESortOption.name_asc),
  },
  {
    data: 'modified_desc',
    label: getTextForSortOption(ESortOption.modified_desc),
  },
  {
    data: 'modified_asc',
    label: getTextForSortOption(ESortOption.modified_asc),
  },
  {
    data: 'created_desc',
    label: getTextForSortOption(ESortOption.created_desc),
  },
  {
    data: 'created_asc',
    label: getTextForSortOption(ESortOption.created_asc),
  },
  {
    data: 'size_desc',
    label: getTextForSortOption(ESortOption.size_desc),
  },
  {
    data: 'size_asc',
    label: getTextForSortOption(ESortOption.size_asc),
  },
];

const iconStyles = {
  paddingRight: '10px',
  width: '1em',
};

const FilePicker: FunctionComponent<FilePickerProps> = ({
  startPath,
  includeFiles = true,
  filter,
  validFileExtensions = null,
  defaultHidden = false, // false by default makes sense for most users
  onSubmit,
  closeModal,
}) => {
  const { t } = useTranslation();

  if (startPath !== '/' && startPath.endsWith('/')) startPath = startPath.substring(0, startPath.length - 1); // remove trailing path
  const [path, setPath] = useState<string>(startPath);
  const [listing] = useState<FileListing>({ files: [], realpath: path });
  const [files, setFiles] = useState<File[]>([]);
  const [error] = useState<string | null>(null);
  const [loading] = useState<boolean>(true);
  const [showHidden, setShowHidden] = useState<boolean>(defaultHidden);
  const [sort, setSort] = useState<SortOption>('name_desc');
  const [selectedFiles, setSelectedFiles] = useState<any>(validFileExtensions);

  const validExtsOptions = useMemo(() => {
    if (!validFileExtensions) return [];
    return [
      { label: t('FilePickerIndex.files.all_files'), value: 'all_files' },
      ...validFileExtensions.map((x) => ({ label: x, value: x })),
    ];
  }, [validFileExtensions]);

  const handleExtsSelect = useCallback((val: any) => {
    // unselect other options if "All Files" is checked
    if (val.includes('all_files')) {
      setSelectedFiles(['all_files']);
    } else {
      setSelectedFiles(val);
    }
  }, []);

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
  }, [listing.files, filter, showHidden, sort, selectedFiles, validFileExtensions]);
  return (
    <>
      <DialogBody>
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
            {loading && <SteamSpinner style={{ height: '100%' }} />}
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
                      {file.isdir ? 'Folder' : filesize(file.size, { standard: 'iec' })}
                      <span style={{ marginLeft: 'auto' }}>{new Date(file.modified * 1000).toLocaleString()}</span>
                    </div>
                  </DialogButton>
                );
              })}
            {error}
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
