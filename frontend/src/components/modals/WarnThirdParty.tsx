import { ConfirmModal } from 'decky-frontend-lib';
import { FC, useEffect, useState } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

import TranslationHelper, { TranslationClass } from '../../utils/TranslationHelper';

interface WarnThirdPartyProps {
  seconds?: number;
  type: WarnThirdPartyType;
  onOK(): void;
  onCancel(): void;
  closeModal?(): void;
}

export enum WarnThirdPartyType {
  REPO = 0,
  ZIP = 1,
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
          <TranslationHelper trans_class={TranslationClass.WARN_THIRD_PARTY} trans_text="title" warn_type={type} />
        </div>
      }
      strOKButtonText={
        waitTimer > 0 ? (
          <div>
            <TranslationHelper
              trans_class={TranslationClass.WARN_THIRD_PARTY}
              trans_text="button_processing"
              i18n_args={{
                timer: waitTimer,
              }}
            />
          </div>
        ) : (
          <div>
            <TranslationHelper trans_class={TranslationClass.WARN_THIRD_PARTY} trans_text="button_idle" />
          </div>
        )
      }
    >
      <span style={{ color: 'red' }}>
        <div>
          <TranslationHelper trans_class={TranslationClass.WARN_THIRD_PARTY} trans_text="desc" warn_type={type} />
        </div>
      </span>
    </ConfirmModal>
  );
};

export default WarnThirdParty;
