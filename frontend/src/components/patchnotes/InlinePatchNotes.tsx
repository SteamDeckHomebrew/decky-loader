import { Focusable, updaterFieldClasses } from 'decky-frontend-lib';
import { FunctionComponent, ReactNode } from 'react';

interface InlinePatchNotesProps {
  date: ReactNode;
  title: string;
  children: ReactNode;
  onClick?: () => void;
}

const InlinePatchNotes: FunctionComponent<InlinePatchNotesProps> = ({ date, title, children, onClick }) => {
  return (
    <Focusable className={updaterFieldClasses.PatchNotes} onActivate={onClick}>
      <div className={updaterFieldClasses.PostedTime}>{date}</div>
      <div className={updaterFieldClasses.EventDetailTitle}>{title}</div>
      <div className={updaterFieldClasses.EventDetailsBody}>{children}</div>
    </Focusable>
  );
};

export default InlinePatchNotes;
