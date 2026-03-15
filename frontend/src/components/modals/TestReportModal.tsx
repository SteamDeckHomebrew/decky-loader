import {
  DialogBody,
  DialogButton,
  DialogControlsSection,
  DialogControlsSectionHeader,
  Field,
  Focusable,
  ModalRoot,
  Spinner,
  TextField,
  Toggle,
} from '@decky/ui';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type SystemInfo = {
  steamos: string;
  steamos_branch: string;
  steam: string;
  steam_branch: string;
  decky: string;
  decky_branch: string;
};

type PluginsInfo = {
  plugins: { name: string; version: string | null }[];
};

interface TestReportModalProps {
  mode?: 'full' | 'simple';
  closeModal?(): void;
}

const apiFetchJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`http://127.0.0.1:1337${path}`, {
    ...init,
    headers: {
      'X-Decky-Auth': deckyAuthToken,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.error || message;
    } catch {
      try {
        message = await res.text();
      } catch {}
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
};

const buildReportFull = (
  system: SystemInfo,
  plugins: PluginsInfo,
  majorIssues: boolean,
  minorIssues: boolean,
  majorIssuesNotes: string,
  minorIssuesNotes: string,
  summary: string,
) => {
  const pluginLines = plugins.plugins.length
    ? plugins.plugins.map((plugin) => `- ${plugin.name} - ${plugin.version ?? 'unknown'}`)
    : ['- None'];

  return [
    '# Plugin Testing Report',
    '<!--',
    '    Make sure you replace all text with "REPLACE_WITH" in it. You can',
    '    check for text that needs updating by searching for "REPLACE_WITH"',
    '    in a text editor or web browser before submitting.',
    '-->',
    '',
    '## Installed Plugins',
    '<!--',
    '    Post all currently installed plugins.',
    '    Include their versions below this comment block. For example...',
    '    - Free Loader - 1.3.0-6f8f352',
    '    - Decky Terminal - 0.4.1',
    '-->',
    ...pluginLines,
    '',
    '## Specifications',
    '<!--',
    '    Post your SteamOS, Steam, and Decky versions below this comment block.',
    '    For example...',
    '    - SteamOS 3.6.20_20241030.1 (Stable OR Beta OR Preview OR Main)',
    '    - Steam 1733265492 (Stable OR Beta)',
    '    - Decky 3.0.5 (Stable OR Pre-Release)',
    '-->',
    `- SteamOS ${system.steamos} (${system.steamos_branch})`,
    `- Steam ${system.steam} (${system.steam_branch})`,
    `- Decky ${system.decky} (${system.decky_branch})`,
    '',
    '## Issues',
    `**Has the following major blocking issue(s):** ${majorIssues ? (majorIssuesNotes || 'Yes') : 'No'}`,
    `**Has the following minor non-blocking issue(s):** ${minorIssues ? (minorIssuesNotes || 'Yes') : 'No'}`,
    '',
    '## Summary',
    '<!--',
    '    Leave a brief summary of how you tested the plugin.',
    '    Please include your experience using it below this comment block.',
    '    For example, "Tested by installing themes and using the...',
    '    new theme features in an example provided by the developers.',
    '    Worked as expected".',
    '-->',
    summary || 'REPLACE_WITH_SUMMARY',
  ].join('\n');
};

const buildReportSimple = (system: SystemInfo, plugins: PluginsInfo) => {
  const pluginLines = plugins.plugins.length
    ? plugins.plugins.map((plugin) => `- ${plugin.name} - ${plugin.version ?? 'unknown'}`)
    : ['- None'];

  return [
    '# System Info Report',
    '',
    '## Installed Plugins',
    ...pluginLines,
    '',
    '## Specifications',
    `- SteamOS ${system.steamos} (${system.steamos_branch})`,
    `- Steam ${system.steam} (${system.steam_branch})`,
    `- Decky ${system.decky} (${system.decky_branch})`,
  ].join('\n');
};

const TestReportModal: FC<TestReportModalProps> = ({ mode = 'full', closeModal }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [pluginsInfo, setPluginsInfo] = useState<PluginsInfo | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [copyMessageType, setCopyMessageType] = useState<'error' | 'success' | null>(null);
  const [pasteUrl, setPasteUrl] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<string | null>(null);
  const [majorIssues, setMajorIssues] = useState(false);
  const [minorIssues, setMinorIssues] = useState(false);
  const [majorIssuesNotes, setMajorIssuesNotes] = useState('');
  const [minorIssuesNotes, setMinorIssuesNotes] = useState('');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    let active = true;
    const loadInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const [system, plugins] = await Promise.all([
          apiFetchJson<SystemInfo>('/report/system'),
          apiFetchJson<PluginsInfo>('/report/plugins'),
        ]);
        if (!active) return;
        setSystemInfo(system);
        setPluginsInfo(plugins);
      } catch (e) {
        if (!active) return;
        setError((e as Error).message || t('SettingsDeveloperIndex.test_report.system_error'));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadInfo();
    return () => {
      active = false;
    };
  }, [t]);

  const handleSend = async () => {
    if (!systemInfo || !pluginsInfo) return;
    setSending(true);
    setError(null);
    setCopyMessage(null);
    setCopyMessageType(null);
    setPasteUrl(null);
    try {
      const report =
        mode === 'simple'
          ? buildReportSimple(systemInfo, pluginsInfo)
          : buildReportFull(
              systemInfo,
              pluginsInfo,
              majorIssues,
              minorIssues,
              majorIssuesNotes,
              minorIssuesNotes,
              summary,
            );
      setLastReport(report);
      const response = await apiFetchJson<{ url: string }>('/report/paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: report }),
      });
      setPasteUrl(response.url);
    } catch (e) {
      setError((e as Error).message || t('SettingsDeveloperIndex.test_report.system_error'));
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async (value: string | null, successKey: string, failKey: string) => {
    if (!value) return;
    try {
      await apiFetchJson('/report/clipboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value }),
      });
      setCopyMessage(t(successKey));
      setCopyMessageType('success');
      return;
    } catch (e) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (ok) {
          setCopyMessage(t(successKey));
          setCopyMessageType('success');
          return;
        }
      } catch {}
      const message = e instanceof Error && e.message ? e.message : t(failKey);
      setCopyMessage(message);
      setCopyMessageType('error');
    }
  };

  return (
    <ModalRoot onCancel={() => closeModal?.()}>
      <DialogBody>
        <DialogControlsSection>
          <DialogControlsSectionHeader>
            {mode === 'simple'
              ? t('SettingsDeveloperIndex.test_report_simple.option_label')
              : t('SettingsDeveloperIndex.test_report.title')}
          </DialogControlsSectionHeader>
          {loading && <Spinner width="24px" height="24px" />}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '20px', rowGap: '24px' }}>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
              {systemInfo && (
                <Field
                  label={t('SettingsDeveloperIndex.test_report.system_info')}
                  description={
                    <div>
                      <div>{`SteamOS ${systemInfo.steamos} (${systemInfo.steamos_branch})`}</div>
                      <div>{`Steam ${systemInfo.steam} (${systemInfo.steam_branch})`}</div>
                      <div>{`Decky ${systemInfo.decky} (${systemInfo.decky_branch})`}</div>
                    </div>
                  }
                />
              )}
              {mode === 'full' && (
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Field label={t('SettingsDeveloperIndex.test_report.major_issues')}>
                    <Toggle value={majorIssues} onChange={(value) => setMajorIssues(value)} />
                  </Field>
                  <Field label={t('SettingsDeveloperIndex.test_report.minor_issues')}>
                    <Toggle value={minorIssues} onChange={(value) => setMinorIssues(value)} />
                  </Field>
                </div>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              {pluginsInfo && (
                <Field
                  label={t('SettingsDeveloperIndex.test_report.plugins')}
                  description={
                    <div style={{ maxHeight: mode === 'simple' ? '170px' : '180px', overflow: 'auto' }}>
                      {pluginsInfo.plugins.length === 0 && (
                        <div>{t('SettingsDeveloperIndex.test_report.no_plugins')}</div>
                      )}
                      {pluginsInfo.plugins.map((plugin) => (
                        <div key={plugin.name}>
                          {plugin.name} - {plugin.version ?? 'unknown'}
                        </div>
                      ))}
                    </div>
                  }
                />
              )}
            </div>
          </div>
          {mode === 'full' && majorIssues && (
            <Field
              label={t('SettingsDeveloperIndex.test_report.major_issues')}
              description={
                <TextField
                  value={majorIssuesNotes}
                  onChange={(e) => setMajorIssuesNotes(e?.target.value || '')}
                />
              }
            />
          )}
          {mode === 'full' && minorIssues && (
            <Field
              label={t('SettingsDeveloperIndex.test_report.minor_issues')}
              description={
                <TextField
                  value={minorIssuesNotes}
                  onChange={(e) => setMinorIssuesNotes(e?.target.value || '')}
                />
              }
            />
          )}
          {mode === 'full' && (
            <Field
              label={t('SettingsDeveloperIndex.test_report.summary')}
              description={
                <div>
                  <div style={{ marginBottom: '6px', opacity: 0.7 }}>
                    {t('SettingsDeveloperIndex.test_report.summary_placeholder')}
                  </div>
                  <TextField value={summary} onChange={(e) => setSummary(e?.target.value || '')} />
                </div>
              }
            />
          )}
          {pasteUrl && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '20px', marginTop: '20px' }}>
              <div style={{ minWidth: 0, display: 'flex' }}>
                <Field
                  label={t('SettingsDeveloperIndex.test_report.qr_label')}
                  description={
                    <div>
                      <div style={{ marginBottom: '8px', opacity: 0.7 }}>
                        {t('SettingsDeveloperIndex.test_report.qr_desc')}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <img
                          alt={t('SettingsDeveloperIndex.test_report.qr_label')}
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                            pasteUrl,
                          )}`}
                        />
                      </div>
                    </div>
                  }
                />
              </div>
              <div style={{ minWidth: 0, display: 'flex' }}>
                <Field
                  label={t('SettingsDeveloperIndex.test_report.copy_title')}
                  description={
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ opacity: 0.7, marginBottom: '8px' }}>
                        {t('SettingsDeveloperIndex.test_report.copy_desc')}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                        <TextField
                          label={t('SettingsDeveloperIndex.test_report.paste_url')}
                          value={pasteUrl}
                          disabled={true}
                        />
                        <DialogButton
                          style={{ width: '100%' }}
                          onClick={() =>
                            handleCopy(
                              pasteUrl,
                              'SettingsDeveloperIndex.test_report.copy_link_success',
                              'SettingsDeveloperIndex.test_report.copy_failed',
                            )
                          }
                        >
                          {t('SettingsDeveloperIndex.test_report.copy_link')}
                        </DialogButton>
                        <DialogButton
                          style={{ width: '100%' }}
                          onClick={() =>
                            handleCopy(
                              lastReport,
                              'SettingsDeveloperIndex.test_report.copy_report_success',
                              'SettingsDeveloperIndex.test_report.copy_failed',
                            )
                          }
                        >
                          {t('SettingsDeveloperIndex.test_report.copy_report')}
                        </DialogButton>
                        <div
                          style={{
                            minHeight: '20px',
                            fontSize: '1em',
                            color: copyMessageType === 'success' ? 'var(--gpSystemColor-Green)' : 'red',
                          }}
                        >
                          {copyMessage || ''}
                        </div>
                      </div>
                    </div>
                  }
                />
              </div>
            </div>
          )}
          {error && <div style={{ color: 'red' }}>{error}</div>}
          <Focusable
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '18px',
              justifyContent: pasteUrl ? 'flex-end' : 'flex-start',
            }}
          >
            <DialogButton
              style={{ minWidth: '160px' }}
              onClick={handleSend}
              disabled={sending || loading || !systemInfo || !pluginsInfo}
            >
              {sending
                ? t('SettingsDeveloperIndex.test_report.sending')
                : t('SettingsDeveloperIndex.test_report.upload_report')}
            </DialogButton>
            <DialogButton style={{ minWidth: '160px' }} onClick={() => closeModal?.()}>
              {t('SettingsDeveloperIndex.test_report.close')}
            </DialogButton>
          </Focusable>
          <div style={{ opacity: 0.7, fontSize: '0.7em', marginTop: '12px' }}>
            {t('SettingsDeveloperIndex.test_report.cloud_notice')}
          </div>
        </DialogControlsSection>
      </DialogBody>
    </ModalRoot>
  );
};

export default TestReportModal;
