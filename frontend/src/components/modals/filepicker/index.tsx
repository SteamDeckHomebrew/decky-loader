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
import { DefaultExtensionType, FileIcon, defaultStyles } from 'react-file-icon';
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
  includeFolders?: boolean;
  filter?: RegExp | ((file: File) => boolean);
  validFileExtensions?: string[];
  allowAllFiles?: boolean;
  defaultHidden?: boolean;
  max?: number;
  fileSelType?: FileSelectionType;
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

export enum FileSelectionType {
  FILE,
  FOLDER,
}

interface FileListing {
  realpath: string;
  files: File[];
  total: number;
}

const sortOptions = [
  {
    data: SortOptions.name_desc,
    label: <TSortOption trans_part={SortOptions.name_desc} />,
  },
  {
    data: SortOptions.name_asc,
    label: <TSortOption trans_part={SortOptions.name_asc} />,
  },
  {
    data: SortOptions.modified_desc,
    label: <TSortOption trans_part={SortOptions.modified_desc} />,
  },
  {
    data: SortOptions.modified_asc,
    label: <TSortOption trans_part={SortOptions.modified_asc} />,
  },
  {
    data: SortOptions.created_desc,
    label: <TSortOption trans_part={SortOptions.created_desc} />,
  },
  {
    data: SortOptions.created_asc,
    label: <TSortOption trans_part={SortOptions.created_asc} />,
  },
  {
    data: SortOptions.size_desc,
    label: <TSortOption trans_part={SortOptions.size_desc} />,
  },
  {
    data: SortOptions.size_asc,
    label: <TSortOption trans_part={SortOptions.size_asc} />,
  },
];

function getList(
  path: string,
  includeFiles: boolean,
  includeFolders: boolean = true,
  includeExt: string[] | null = null,
  includeHidden: boolean = false,
  orderBy: SortOptions = SortOptions.name_desc,
  filterFor: RegExp | ((file: File) => boolean) | null = null,
  pageNumber: number = 1,
  max: number = 1000,
): Promise<{ result: FileListing | string; success: boolean }> {
  return window.DeckyPluginLoader.callServerMethod('filepicker_ls', {
    path,
    include_files: includeFiles,
    include_folders: includeFolders,
    include_ext: includeExt ? includeExt : [],
    include_hidden: includeHidden,
    order_by: orderBy,
    filter_for: filterFor,
    page: pageNumber,
    max: max,
  });
}

const iconStyles = {
  paddingRight: '10px',
  width: '1em',
};

const FilePicker: FunctionComponent<FilePickerProps> = ({
  startPath,
  //What are we allowing to show in the file picker
  includeFiles = true,
  includeFolders = true,
  //Parameter for specifying a specific filename match
  filter = undefined,
  //Filter for specific extensions as an array
  validFileExtensions = undefined,
  //Allow to override the fixed extension above
  allowAllFiles = true,
  //If we need to show hidden files and folders (both Win and Linux should work)
  defaultHidden = false, // false by default makes sense for most users
  //How much files per page to show, default 1000
  max = 1000,
  //Which picking option to select by default
  fileSelType = FileSelectionType.FOLDER,
  onSubmit,
  closeModal,
}) => {
  const { t } = useTranslation();

  if (startPath !== '/' && startPath.endsWith('/')) startPath = startPath.substring(0, startPath.length - 1); // remove trailing path
  const [path, setPath] = useState<string>(startPath);
  const [listing, setListing] = useState<FileListing>({ files: [], realpath: path, total: 0 });
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<FileErrorTypes>(FileErrorTypes.None);
  const [rawError, setRawError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [showHidden, setShowHidden] = useState<boolean>(defaultHidden);
  const [sort, setSort] = useState<SortOptions>(SortOptions.name_desc);
  const [selectedExts, setSelectedExts] = useState<string[] | undefined>(validFileExtensions);

  const validExtsOptions = useMemo(() => {
    let validExt: { label: string; value: string }[] = [];
    if (validFileExtensions) {
      if (allowAllFiles) {
        validExt.push({ label: t('FilePickerIndex.files.all_files'), value: 'all_files' });
      }
      validExt.push(...validFileExtensions.map((x) => ({ label: x, value: x })));
    }
    return validExt;
  }, [validFileExtensions, allowAllFiles]);

  function isSelectionValid(validExts: string[], selection: string[]) {
    if (validExts.some((el) => selection.includes(el))) return true;
    return false;
  }

  const handleExtsSelect = useCallback((val: any) => {
    // unselect other options if "All Files" is checked
    if (allowAllFiles && val.includes('all_files')) {
      setSelectedExts(['all_files']);
    } else if (validFileExtensions && isSelectionValid(validFileExtensions, val)) {
      // If at least one extension is still selected, then assign this selection to the selected values
      setSelectedExts(val);
    } else {
      // Else do nothing
      setSelectedExts(selectedExts);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const listing = await getList(
        path,
        includeFiles,
        includeFolders,
        selectedExts,
        showHidden,
        sort,
        filter,
        page,
        max,
      );
      if (!listing.success) {
        setListing({ files: [], realpath: path, total: 0 });
        setLoading(false);
        const theError = listing.result as string;
        switch (theError) {
          case theError.match(/\[Errno\s2.*/i)?.input:
          case theError.match(/\[WinError\s3.*/i)?.input:
            setError(FileErrorTypes.FileNotFound);
            break;
          case theError.match(/\[Errno\s13.*/i)?.input:
            setError(FileErrorTypes.PermissionDenied);
            break;
          default:
            setRawError(theError);
            setError(FileErrorTypes.Unknown);
            break;
        }
        logger.debug(theError);
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
  }, [error, path, includeFiles, includeFolders, showHidden, sort, selectedExts, page]);

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
                const lastPath = newPathArr.pop();
                //If I have a single / with spaces, pop the array twice
                if (lastPath?.match(/^\/\s*$/) != null) newPathArr.pop();
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
                selected={selectedExts ? selectedExts : []}
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
              error === FileErrorTypes.None &&
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
                            <FileIcon
                              {...defaultStyles[extension as DefaultExtensionType]}
                              // @ts-expect-error
                              {...styleDefObj[extension]}
                              extension={''}
                            />
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
      {!loading && error === FileErrorTypes.None && (
        <DialogFooter>
          <DialogButton
            className="Primary"
            style={{ marginTop: '10px', alignSelf: 'flex-end' }}
            onClick={() => {
              onSubmit({ path, realpath: listing.realpath });
              closeModal?.();
            }}
          >
            {fileSelType === FileSelectionType.FILE
              ? t('FilePickerIndex.file.select')
              : t('FilePickerIndex.folder.select')}
          </DialogButton>
        </DialogFooter>
      )}
      {page * max < listing.total && (
        <DialogFooter>
          <DialogButton
            className="Primary"
            style={{ marginTop: '10px', alignSelf: 'flex-end' }}
            onClick={() => {
              setPage(page + 1);
            }}
          >
            {t('FilePickerIndex.folder.show_more')}
          </DialogButton>
        </DialogFooter>
      )}
    </>
  );
};

export default FilePicker;
