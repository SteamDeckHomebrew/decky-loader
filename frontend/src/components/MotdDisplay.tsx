import { DialogButton, Focusable, PanelSection } from '@decky/ui';
import { useEffect, useMemo, useState } from 'react';
import { FaTimes } from 'react-icons/fa';

import { Motd, getMotd } from '../store';
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

const welcomeMotd: Motd = {
  id: 'welcomeMotd',
  name: 'Welcome to Decky!',
  date: Date.now().toString(),
  description: 'We hope you enjoy using Decky! If you have any questions or feedback, please let us know.',
  severity: 'Low',
};

export function MotdDisplay() {
  const [motd, setMotd] = useState<Motd | null>(null);
  // showWelcome will display a welcome motd, the welcome motd has an id of "welcome" and once that is saved to hiddenMotdId, it will not show again
  const [hiddenMotdId, setHiddenMotdId] = useSetting('hiddenMotdId', 'showWelcome');

  async function fetchMotd() {
    const motd = await getMotd();
    setMotd(motd);
  }

  useEffect(() => {
    void fetchMotd();
  }, []);

  useEffect(() => {
    if (hiddenMotdId === 'showWelcome') {
      setMotd(welcomeMotd);
    }
  }, [hiddenMotdId]);

  function hideMotd() {
    if (motd) {
      setHiddenMotdId(motd.id);
      void fetchMotd();
    }
  }

  const hidden = useMemo(() => {
    return hiddenMotdId === motd?.id;
  }, [hiddenMotdId, motd]);

  if (!motd || !motd?.name || hidden) {
    return null;
  }

  const severity = SEVERITIES[motd?.severity || 'Low'];

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
          <span style={{ fontWeight: 'bold' }}>{motd?.name}</span>
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
            onClick={hideMotd}
          >
            <FaTimes
              style={{
                height: '.75rem',
              }}
            />
          </DialogButton>
        </div>
        <span style={{ fontSize: '0.75rem', whiteSpace: 'pre-line' }}>{motd?.description}</span>
      </Focusable>
    </PanelSection>
  );
}
