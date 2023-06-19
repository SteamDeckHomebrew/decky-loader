import { FC } from 'react';
import { Translation } from 'react-i18next';

export enum SortOptions {
  name_desc = 'name_desc',
  name_asc = 'name_asc',
  modified_desc = 'modified_desc',
  modified_asc = 'modified_asc',
  created_desc = 'created_desc',
  created_asc = 'created_asc',
  size_desc = 'size_desc',
  size_asc = 'size_asc',
}

interface TSortOptionsProps {
  trans_part: SortOptions;
}

const TSortOptions: FC<TSortOptionsProps> = ({ trans_part }) => {
  return (
    <Translation>
      {(t, {}) => {
        switch (trans_part) {
          case SortOptions.name_desc:
            return t('FilePickerIndex.filter.name_desc');
          case SortOptions.name_asc:
            return t('FilePickerIndex.filter.name_asce');
          case SortOptions.modified_desc:
            return t('FilePickerIndex.filter.modified_desc');
          case SortOptions.modified_asc:
            return t('FilePickerIndex.filter.modified_asce');
          case SortOptions.created_desc:
            return t('FilePickerIndex.filter.created_desc');
          case SortOptions.created_asc:
            return t('FilePickerIndex.filter.created_asce');
          case SortOptions.size_desc:
            return t('FilePickerIndex.filter.size_desc');
          case SortOptions.size_asc:
            return t('FilePickerIndex.filter.size_asce');
        }
      }}
    </Translation>
  );
};

export default TSortOptions;
