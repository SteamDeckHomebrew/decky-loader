import { ConfirmModal } from '@decky/ui';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { FaExclamationTriangle } from 'react-icons/fa';

export enum HashMismatchTypes {
  NULL_HASH_TESTING,
  NULL_HASH_RELEASE,
  HASH_MISMATCH,
}

interface HashMismatchModalProps {
  idType: HashMismatchTypes;
}

const HashMismatchModal: FC<HashMismatchModalProps> = ({ idType }) => {
  const { t } = useTranslation();
  switch (idType) {
    case HashMismatchTypes.HASH_MISMATCH:
      return (
        <ConfirmModal
          strTitle={
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <FaExclamationTriangle />
              {t('HashMismatchModal.HashMismatch.Title')}
            </div>
          }
          strOKButtonText={t('Common.Confirm')}
        >
          {t('HashMismatchModal.HashMismatch.Description')}
        </ConfirmModal>
      );
    case HashMismatchTypes.NULL_HASH_RELEASE:
      return (
        <ConfirmModal
          strTitle={
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <FaExclamationTriangle />
              {t('HashMismatchModal.NullHashRelease.Title')}
            </div>
          }
          strOKButtonText={t('Common.Confirm')}
        >
          {t('HashMismatchModal.NullHashRelease.Description')}
        </ConfirmModal>
      );
    case HashMismatchTypes.NULL_HASH_TESTING:
      return (
        <ConfirmModal
          strTitle={
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <FaExclamationTriangle />
              {t('HashMismatchModal.NullHashTesting.Title')}
            </div>
          }
          strOKButtonText={t('Common.Confirm')}
        >
          {t('HashMismatchModal.NullHashTesting.Description')}
        </ConfirmModal>
      );
  }
};

export default HashMismatchModal;
