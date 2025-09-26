import { DialogButton, Focusable, ModalRoot, PanelSection, ScrollPanelGroup, showModal } from '@decky/ui';
import { lazy, useEffect, useMemo, useState } from 'react';
import { FaInfo, FaTimes } from 'react-icons/fa';

import { Announcement, getAnnouncements } from '../store';
import { useSetting } from '../utils/hooks/useSetting';
import WithSuspense from './WithSuspense';

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

const welcomeAnnouncement2: Announcement = {
  id: 'welcomeAnnouncement2',
  title: 'Test With mkdown content and a slightly long title',
  text: '# Lorem Ipsum\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n## Features\n\n- **Bold text** for emphasis\n- *Italic text* for style\n- `Code snippets` for technical content\n\n### Getting Started\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\n> This is a blockquote with some important information.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  created: Date.now().toString(),
  updated: Date.now().toString(),
};

export function AnnouncementsDisplay() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([welcomeAnnouncement, welcomeAnnouncement2]);
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

  const currentlyDisplayingAnnouncements: Announcement[] = useMemo(() => {
    return announcements.filter((announcement) => !hiddenAnnouncementIds.includes(announcement.id));
  }, [announcements, hiddenAnnouncementIds]);

  function hideAnnouncement(id: string) {
    setHiddenAnnouncementIds([...hiddenAnnouncementIds, id]);
    void fetchAnnouncement();
  }

  if (currentlyDisplayingAnnouncements.length === 0) {
    return null;
  }

  return (
    <PanelSection>
      <Focusable style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {currentlyDisplayingAnnouncements.map((announcement) => (
          <Announcement
            key={announcement.id}
            announcement={announcement}
            onHide={() => hideAnnouncement(announcement.id)}
          />
        ))}
      </Focusable>
    </PanelSection>
  );
}

function Announcement({ announcement, onHide }: { announcement: Announcement; onHide: () => void }) {
  // Severity is not implemented in the API currently
  const severity = SEVERITIES['Low'];
  return (
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
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span style={{ fontWeight: 'bold' }}>{announcement.title}</span>
      <Focusable style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <DialogButton
          style={{
            width: '1rem',
            minWidth: '1rem',
            height: '1rem',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() =>
            showModal(
              <AnnouncementModal
                announcement={announcement}
                onHide={() => {
                  onHide();
                }}
              />,
            )
          }
        >
          <FaInfo
            style={{
              height: '.75rem',
            }}
          />
        </DialogButton>
        <DialogButton
          style={{
            width: '1rem',
            minWidth: '1rem',
            height: '1rem',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => onHide()}
        >
          <FaTimes
            style={{
              height: '.75rem',
            }}
          />
        </DialogButton>
      </Focusable>
    </Focusable>
  );
}

const MarkdownRenderer = lazy(() => import('./Markdown'));

function AnnouncementModal({
  announcement,
  closeModal,
  onHide,
}: {
  announcement: Announcement;
  closeModal?: () => void;
  onHide: () => void;
}) {
  return (
    <ModalRoot onCancel={closeModal} onEscKeypress={closeModal}>
      <style>
        {`
          .steam-focus {
            outline-offset: 3px;
            outline: 2px solid rgba(255, 255, 255, 0.6);
            animation: pulseOutline 1.2s infinite ease-in-out;
          }

          @keyframes pulseOutline {
            0% {
              outline: 2px solid rgba(255, 255, 255, 0.6);
            }
            50% {
              outline: 2px solid rgba(255, 255, 255, 1);
            }
            100% {
              outline: 2px solid rgba(255, 255, 255, 0.6);
            }
          }
        `}
      </style>
      <Focusable style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: 'calc(100vh - 200px)' }}>
        <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>{announcement.title}</span>
        <span style={{ opacity: 0.5 }}>Use your finger to scroll</span>
        <ScrollPanelGroup
          // @ts-ignore
          focusable={false}
          style={{ flex: 1, height: '100%' }}
          // onCancelButton doesn't work here
          onCancelActionDescription="Back"
          onButtonDown={(evt: any) => {
            if (!evt?.detail?.button) return;
            if (evt.detail.button === 2) {
              closeModal?.();
            }
          }}
        >
          <WithSuspense>
            <MarkdownRenderer
              onDismiss={() => {
                closeModal?.();
              }}
            >
              {announcement.text}
            </MarkdownRenderer>
          </WithSuspense>
        </ScrollPanelGroup>
        <Focusable style={{ display: 'flex', gap: '0.5rem' }}>
          <DialogButton onClick={() => closeModal?.()}>Close</DialogButton>
          <DialogButton
            onClick={() => {
              // onHide();
              closeModal?.();
            }}
          >
            Close and Hide Announcement
          </DialogButton>
        </Focusable>
      </Focusable>
    </ModalRoot>
  );
}
