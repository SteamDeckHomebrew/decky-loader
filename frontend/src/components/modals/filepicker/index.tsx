import {
  ControlsList,
  DialogButton,
  Focusable,
  SteamSpinner,
  TextField,
  DialogBody,
  DialogControlsSection,
  DialogFooter,
  ToggleField,
} from 'decky-frontend-lib';
import { useEffect } from 'react';
import { FunctionComponent, useState } from 'react';
import { FileIcon, defaultStyles } from 'react-file-icon';
import { FaArrowUp, FaFolder } from 'react-icons/fa';

import Logger from '../../../logger';
import { styleDefObj } from './iconCustomizations';

const logger = new Logger('FilePicker');

export interface FilePickerProps {
  startPath: string;
  includeFiles?: boolean;
  filter?: RegExp | ((file: File) => boolean);
  onSubmit: (val: { path: string; realpath: string }) => void;
  closeModal?: () => void;
}

export interface File {
  isdir: boolean;
  ishidden: boolean;
  name: string;
  realpath: string;
}

interface FileListing {
  realpath: string;
  files: File[];
}

function getList(
  path: string,
  includeFiles: boolean
): Promise<{ result: FileListing | string; success: boolean }> {
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
  defaultHidden = false, // false by default makes sense for most use cases
  onSubmit,
  closeModal,
}) => {
  if (startPath.endsWith('/')) startPath = startPath.substring(0, startPath.length - 1); // remove trailing path
  const [path, setPath] = useState<string>(startPath);
  const [listing, setListing] = useState<FileListing>({ files: [], realpath: path });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showHidden, setShowHidden] = useState<boolean>(defaultHidden);

  useEffect(() => {
    (async () => {
      if (error) setError(null);
      setLoading(true);
      const listing = await getList(path, includeFiles);
      if (!listing.success) {
        setListing({ files: [], realpath: path });
        setLoading(false);
        setError(listing.result as string);
        logger.error(listing.result);
        return;
      }
      setLoading(false);
      setListing(listing.result as FileListing);
      logger.log('reloaded', path, listing);
    })();
  }, [error, includeFiles, path]);

  return (
    <>
      <DialogBody className="deckyFilePicker">
        <DialogControlsSection>
          <Focusable flow-children="right" style={{ display: 'flex' }}>
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
          <ControlsList spacing="standard">
            <ToggleField
              highlightOnFocus={false}
              label="Show Hidden Files"
              bottomSeparator="none"
              checked={showHidden}
              onChange={() => setShowHidden((x) => !x)}
            />
          </ControlsList>
        </DialogControlsSection>
        <DialogControlsSection>
          <Focusable style={{ display: 'flex', flexDirection: 'column', height: '60vh', overflow: 'scroll' }}>
            {loading && <SteamSpinner style={{ height: '100%' }} />}
            {!loading &&
            listing.files
              // Run filter from UI before user supplied filter
              .filter((file) => {
                if (showHidden && file.ishidden) return true;
                if (!showHidden && file.ishidden) return false;
                return true;
              })
              .filter((file) => {
                if (filter instanceof RegExp) return filter.test(file.name);
                if (typeof filter === 'function') return filter(file);
                return true;
              })
              .map((file) => {
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
                      {file.name}
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
          Use this folder
          </DialogButton>
        </DialogFooter>
      )}
    </>
  );
};

export default FilePicker;
