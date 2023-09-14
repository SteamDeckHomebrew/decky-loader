import { SidebarNavigation, SteamSpinner, useParams } from 'decky-frontend-lib';
import i18n from 'i18next';
import { VFC, useEffect, useState } from 'react';
import { lazy } from 'react';

import { ScrollArea, Scrollable, scrollableRef } from './Scrollable';

const MarkdownRenderer = lazy(() => import('./Markdown'));

const DocsPage: VFC<{ content: string }> = ({ content }) => {
  const ref = scrollableRef();

  return (
    <>
      <style>
        {`
        .decky-docs-markdown p {white-space: pre-wrap}
        .decky-docs-markdown a {text-decoration: none;}
        .decky-docs-markdown code {color: #f1ac4f; padding: 2px 4px; border-radius: 4px;}
        .decky-docs-markdown table {border: 1px solid; border-collapse: collapse;}
        .decky-docs-markdown th {padding: 0 7px; border: 1px solid;}
        .decky-docs-markdown td {padding: 0 7px; border: 1px solid;}
        .decky-docs-markdown tr:nth-child(odd) {background-color: #1B2838;}
        .decky-docs-markdown > .Panel.Focusable.gpfocuswithin {background-color: #868da117;}
        .decky-docs-markdown img {max-width: 588px;}
        `}
      </style>
      <Scrollable ref={ref}>
        <ScrollArea scrollable={ref} noFocusRing={true}>
          <MarkdownRenderer className="decky-docs-markdown" children={content} />
        </ScrollArea>
      </Scrollable>
    </>
  );
};

interface DocsPage {
  title: string;
  text: string;
}

const StorePage: VFC<{}> = () => {
  const [docs, setDocs] = useState<(DocsPage | 'separator')[] | null>(null);
  const { plugin } = useParams<{ plugin: string }>();

  useEffect(() => {
    (async () => {
      setDocs(
        await (
          await fetch(`http://127.0.0.1:1337/docs/${plugin}/${i18n.resolvedLanguage}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              Authentication: window.deckyAuthToken,
            },
          })
        ).json(),
      );
    })();
  }, []);

  return (
    <>
      {!docs ? (
        <div style={{ height: '100%' }}>
          <SteamSpinner />
        </div>
      ) : docs.length == 1 ? (
        <div
          style={{
            padding: 'calc(12px + 1.4vw) 2.8vw',
            paddingTop: 'calc( 24px + var(--basicui-header-height, 0px) )',
            background: '#0e141b',
          }}
        >
          <DocsPage content={docs[Object.keys(docs)[0]]['text']} />
        </div>
      ) : (
        <SidebarNavigation
          title={plugin}
          showTitle={true}
          pages={docs.map((file) =>
            file == 'separator'
              ? 'separator'
              : {
                  title: file['title'],
                  content: <DocsPage content={file['text']} />,
                  route: `/decky/docs/${plugin}/${file['title']}`,
                  hideTitle: true,
                },
          )}
        />
      )}
    </>
  );
};

export default StorePage;
