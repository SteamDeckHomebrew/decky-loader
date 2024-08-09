import { ConfirmModal } from '@decky/ui';
import { FC, useEffect, useState } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

import TranslationHelper, { TranslationClass } from '../../utils/TranslationHelper';
import { WarnThirdPartyType } from '../../utils/globalTypes';

interface WarnThirdPartyProps {
  seconds?: number;
  type: WarnThirdPartyType;
  onOK(): void;
  onCancel(): void;
  closeModal?(): void;
}

const WarnThirdParty: FC<WarnThirdPartyProps> = ({ seconds = 5, type, onOK, onCancel, closeModal }) => {
  const [waitTimer, setWaitTimer] = useState(seconds);

  useEffect(() => {
    // exit early when we reach 0
    if (waitTimer <= 0) return;

    // save intervalId to clear the interval when the
    // component re-renders
    const intervalId = setInterval(() => {
      setWaitTimer(waitTimer - 1);
    }, 1000);

    // clear interval on re-render to avoid memory leaks
    return () => clearInterval(intervalId);
    // add waitTimer as a dependency to re-rerun the effect
    // when we update it
  }, [waitTimer]);

  return (
    <ConfirmModal
      bOKDisabled={waitTimer > 0}
      closeModal={closeModal}
      onOK={async () => {
        await onOK();
      }}
      onCancel={async () => {
        await onCancel();
      }}
      strTitle={
        <div>
          <FaExclamationTriangle />
          <TranslationHelper transClass={TranslationClass.WARN_THIRD_PARTY} transText="title" warnType={type} />
        </div>
      }
      strOKButtonText={
        waitTimer > 0 ? (
          <div>
            <TranslationHelper
              transClass={TranslationClass.WARN_THIRD_PARTY}
              transText="button_processing"
              i18nArgs={{
                timer: waitTimer,
              }}
            />
          </div>
        ) : (
          <div>
            <TranslationHelper transClass={TranslationClass.WARN_THIRD_PARTY} transText="button_idle" />
          </div>
        )
      }
    >
      <span style={{ color: 'red' }}>
        <div>
          <TranslationHelper transClass={TranslationClass.WARN_THIRD_PARTY} transText="desc" warnType={type} />
        </div>
      </span>
    </ConfirmModal>
  );
};

export default WarnThirdParty;
