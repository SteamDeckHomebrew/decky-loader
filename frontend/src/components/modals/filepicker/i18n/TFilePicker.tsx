import { FC } from 'react';
import { Translation } from 'react-i18next';

export enum TranslatedPart {
  'name_desc',
  'name_asc',
  'modified_desc',
  'modified_asc',
  'created_desc',
  'created_asc',
  'size_desc',
  'size_asc',
}

interface TFilePickerProps {
  trans_part: TranslatedPart;
}

const TFilePicker: FC<TFilePickerProps> = ({ trans_part }) => {
  return (
    <Translation>
      {(t, {}) => {
        switch (trans_part) {
          case TranslatedPart.name_desc:
            return t('FilePickerIndex.filter.name_desc');
          case TranslatedPart.name_asc:
            return t('FilePickerIndex.filter.name_asce');
          case TranslatedPart.modified_desc:
            return t('FilePickerIndex.filter.modified_desc');
          case TranslatedPart.modified_asc:
            return t('FilePickerIndex.filter.modified_asce');
          case TranslatedPart.created_desc:
            return t('FilePickerIndex.filter.created_desc');
          case TranslatedPart.created_asc:
            return t('FilePickerIndex.filter.created_asce');
          case TranslatedPart.size_desc:
            return t('FilePickerIndex.filter.size_desc');
          case TranslatedPart.size_asc:
            return t('FilePickerIndex.filter.size_asce');
        }
      }}
    </Translation>
  );
};

export default TFilePicker;
