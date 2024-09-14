import { DialogButton, Focusable, PanelSection } from '@decky/ui';
import { useEffect, useMemo, useState } from 'react';
import { FaTimes } from 'react-icons/fa';

import { Announcement, getAnnouncements } from '../store';
import { useSetting } from '../utils/hooks/useSetting';

const SEVERITIES = {
  High: {
    color: '#bb1414',
    text: '#fff',
  },
  Medium: {
    color: '#bbbb14',
    text: '#fff',
  },
  Low: {
    color: '#1488bb',
    text: '#fff',
  },
};

const welcomeAnnouncement: Announcement = {
  id: 'welcomeAnnouncement',
  title: 'Welcome to Decky!',
  text: 'We hope you enjoy using Decky! If you have any questions or feedback, please let us know.',
  created: Date.now().toString(),
  updated: Date.now().toString(),
};

export function AnnouncementsDisplay() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([welcomeAnnouncement]);
  // showWelcome will display a welcome motd, the welcome motd has an id of "welcome" and once that is saved to hiddenMotdId, it will not show again
  const [hiddenAnnouncementIds, setHiddenAnnouncementIds] = useSetting<string[]>('hiddenAnnouncementIds', []);

  function addAnnouncements(newAnnouncements: Announcement[]) {
    // Removes any duplicates and sorts by created date
    setAnnouncements((oldAnnouncements) => {
      const newArr = [...oldAnnouncements, ...newAnnouncements];
      const setOfIds = new Set(newArr.map((a) => a.id));
      return (
        (
          Array.from(setOfIds)
            .map((id) => newArr.find((a) => a.id === id))
            // Typescript doesn't type filter(Boolean) correctly, so I have to assert this
            .filter(Boolean) as Announcement[]
        ).sort((a, b) => {
          return new Date(b.created).getTime() - new Date(a.created).getTime();
        })
      );
    });
  }

  async function fetchAnnouncement() {
    const announcements = await getAnnouncements();
    announcements && addAnnouncements(announcements);
  }

  useEffect(() => {
    void fetchAnnouncement();
  }, []);

  const currentlyDisplayingAnnouncement: Announcement | null = useMemo(() => {
    return announcements.find((announcement) => !hiddenAnnouncementIds.includes(announcement.id)) || null;
  }, [announcements, hiddenAnnouncementIds]);

  function hideAnnouncement(id: string) {
    setHiddenAnnouncementIds([...hiddenAnnouncementIds, id]);
    void fetchAnnouncement();
  }

  if (!currentlyDisplayingAnnouncement) {
    return null;
  }

  // Severity is not implemented in the API currently
  const severity = SEVERITIES['Low'];

  return (
    <PanelSection>
      <Focusable
        style={{
          // Transparency is 20% of the color
          backgroundColor: `${severity.color}33`,
          color: severity.text,
          borderColor: severity.color,
          borderWidth: '2px',
          borderStyle: 'solid',
          padding: '0.7rem',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold' }}>{currentlyDisplayingAnnouncement.title}</span>
          <DialogButton
            style={{
              width: '1rem',
              minWidth: '1rem',
              height: '1rem',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              top: '.75rem',
              right: '.75rem',
            }}
            onClick={() => hideAnnouncement(currentlyDisplayingAnnouncement.id)}
          >
            <FaTimes
              style={{
                height: '.75rem',
              }}
            />
          </DialogButton>
        </div>
        <span style={{ fontSize: '0.75rem', whiteSpace: 'pre-line' }}>{currentlyDisplayingAnnouncement.text}</span>
      </Focusable>
    </PanelSection>
  );
}
