import { DialogButton, Focusable, PanelSection } from '@decky/ui';
import { useEffect, useMemo, useState } from 'react';
import { FaTimes } from 'react-icons/fa';

import { Announcement, getLatestAnnouncement } from '../store';
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
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  // showWelcome will display a welcome motd, the welcome motd has an id of "welcome" and once that is saved to hiddenMotdId, it will not show again
  const [hiddenAnnouncementId, setHiddenAnnouncementId] = useSetting('hiddenAnnouncementId', 'showWelcome');

  async function fetchAnnouncement() {
    const announcement = await getLatestAnnouncement();
    announcement && setAnnouncement(announcement);
  }

  useEffect(() => {
    void fetchAnnouncement();
  }, []);

  useEffect(() => {
    if (hiddenAnnouncementId === 'showWelcome') {
      setAnnouncement(welcomeAnnouncement);
    }
  }, [hiddenAnnouncementId]);

  function hideAnnouncement() {
    if (announcement) {
      setHiddenAnnouncementId(announcement.id);
      void fetchAnnouncement();
    }
  }

  const hidden = useMemo(() => {
    return hiddenAnnouncementId === announcement?.id;
  }, [hiddenAnnouncementId, announcement]);

  if (!announcement || !announcement.title || hidden) {
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
          <span style={{ fontWeight: 'bold' }}>{announcement.title}</span>
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
            onClick={hideAnnouncement}
          >
            <FaTimes
              style={{
                height: '.75rem',
              }}
            />
          </DialogButton>
        </div>
        <span style={{ fontSize: '0.75rem', whiteSpace: 'pre-line' }}>{announcement.text}</span>
      </Focusable>
    </PanelSection>
  );
}
