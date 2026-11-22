import type * as React from 'react';
import type * as ReactDOM from 'react-dom';
import type * as JSXRuntime from 'react/jsx-runtime';
declare global {
  interface Window {
    SP_REACT: typeof React;
    SP_REACTDOM: typeof ReactDOM;
    SP_JSX: typeof JSXRuntime;
  }
}
