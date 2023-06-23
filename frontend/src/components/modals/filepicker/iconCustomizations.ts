// https://codesandbox.io/s/react-file-icon-colored-tmwut?file=/src/App.js
import { FileIconProps } from 'react-file-icon';

type T_FileExtList = string[];

const styleDef: [FileIconProps, T_FileExtList][] = [];

// video ////////////////////////////////////
const videoStyle = {
  color: '#f00f0f',
};
const videoExtList = [
  'avi',
  '3g2',
  '3gp',
  'aep',
  'asf',
  'flv',
  'm4v',
  'mkv',
  'mov',
  'mp4',
  'mpeg',
  'mpg',
  'ogv',
  'pr',
  'swfw',
  'webm',
  'wmv',
  'swf',
  'rm',
];

styleDef.push([videoStyle, videoExtList]);

// image ////////////////////////////////////
const imageStyle = {
  color: '#d18f00',
};

const imageExtList = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tif', 'tiff', 'apng', 'tga'];

styleDef.push([imageStyle, imageExtList]);

// zip ////////////////////////////////////
const zipStyle = {
  color: '#f7b500',
  labelTextColor: '#000',
  // glyphColor: "#de9400"
};

const zipExtList = ['zip', 'zipx', '7zip', 'tar', 'sitx', 'gz', 'rar'];

styleDef.push([zipStyle, zipExtList]);

// audio ////////////////////////////////////
const audioStyle = {
  color: '#f00f0f',
};

const audioExtList = ['aac', 'aif', 'aiff', 'flac', 'm4a', 'mid', 'mp3', 'ogg', 'wav'];

styleDef.push([audioStyle, audioExtList]);

// text ////////////////////////////////////
const textStyle = {
  color: '#ffffff',
  glyphColor: '#787878',
};

const textExtList = ['cue', 'odt', 'md', 'rtf', 'txt', 'tex', 'wpd', 'wps', 'xlr', 'fodt'];

styleDef.push([textStyle, textExtList]);

// system ////////////////////////////////////
const systemStyle = {
  color: '#111',
};

const systemExtList = ['exe', 'ini', 'dll', 'plist', 'sys'];

styleDef.push([systemStyle, systemExtList]);

// srcCode ////////////////////////////////////
const srcCodeStyle = {
  glyphColor: '#787878',
  color: '#ffffff',
};

const srcCodeExtList = [
  'asp',
  'aspx',
  'c',
  'cpp',
  'cs',
  'css',
  'scss',
  'py',
  'json',
  'htm',
  'html',
  'java',
  'yml',
  'php',
  'js',
  'ts',
  'rb',
  'jsx',
  'tsx',
];

styleDef.push([srcCodeStyle, srcCodeExtList]);

// vector ////////////////////////////////////
const vectorStyle = {
  color: '#ffe600',
};

const vectorExtList = ['dwg', 'dxf', 'ps', 'svg', 'eps'];

styleDef.push([vectorStyle, vectorExtList]);

// font ////////////////////////////////////
const fontStyle = {
  color: '#555',
};

const fontExtList = ['fnt', 'ttf', 'otf', 'fon', 'eot', 'woff'];

styleDef.push([fontStyle, fontExtList]);

// objectModel ////////////////////////////////////
const objectModelStyle = {
  color: '#bf6a02',
  glyphColor: '#bf6a02',
};

const objectModelExtList = ['3dm', '3ds', 'max', 'obj', 'pkg'];

styleDef.push([objectModelStyle, objectModelExtList]);

// sheet ////////////////////////////////////
const sheetStyle = {
  color: '#2a6e00',
};

const sheetExtList = ['csv', 'fods', 'ods', 'xlr'];

styleDef.push([sheetStyle, sheetExtList]);

// const defaultStyle: Record<string, FileIconProps> = {
//   pdf: {
// glyphColor: "white",
// color: "#D93831"
//   }
// };

//////////////////////////////////////////////////

function createStyleObj(extList: T_FileExtList, styleObj: Partial<FileIconProps>) {
  return Object.fromEntries(
    extList.map((ext) => {
      return [ext, { ...styleObj, glyphColor: 'white' }];
    }),
  );
}

export const styleDefObj = styleDef.reduce((acc, [fileStyle, fileExtList]) => {
  return { ...acc, ...createStyleObj(fileExtList, fileStyle) };
});
