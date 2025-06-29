import importSort from 'prettier-plugin-import-sort';
export default {
  semi: true,
  trailingComma: 'all',
  singleQuote: true,
  printWidth: 120,
  tabWidth: 2,
  endOfLine: 'auto',
  plugins: [importSort],
};
