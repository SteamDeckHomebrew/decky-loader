import { VFC, useEffect, useState } from 'react';
import { useParams, SidebarNavigation, SteamSpinner, Focusable } from "decky-frontend-lib";
import { lazy } from 'react';
import i18n from 'i18next';

import { ScrollArea, Scrollable, scrollableRef } from "./Scrollable";
const MarkdownRenderer = lazy(() => import('./Markdown'));

const DocsPage: VFC<{ content: string }> = ({ content }) => {
      const ref = scrollableRef();
      return (
      <>
        <style>
        {`
          .deckyDocsMarkdown p {white-space: pre-wrap}
          .deckyDocsMarkdown code {background: #9999990f;}
          .deckyDocsMarkdown a {text-decoration: none;}
        `}
        </style>
        <Scrollable ref={ref}>
            <ScrollArea scrollable={ref} noFocusRing={true}>
              <MarkdownRenderer className="deckyDocsMarkdown" children={content} />
          </ScrollArea>
        </Scrollable>
      </>
      )
}

const StorePage: VFC<{}> = () => {

    const [docs, setDocs] = useState<Object | null>(null); // {"filename": {"name":"readable name", "text":"marked up file"}}
    const { plugin } = useParams<{ plugin: string }>()

    useEffect(() => {
    (async () => {
      setDocs(await (await fetch(`http://127.0.0.1:1337/docs/${plugin}/${i18n.resolvedLanguage}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authentication: window.deckyAuthToken,
        }
        })).json())
      })();
    }, []);

    return (
      <>
      {!docs ?
        <div style={{ height: '100%' }}>
          <SteamSpinner />
        </div>
      : (Object.keys(docs).length == 1) ?
      <Focusable style={{padding:"calc(12px + 1.4vw) 2.8vw", paddingTop:"calc( 24px + var(--basicui-header-height, 0px) )"}} className="deckyDocsMarkdown">
        <MarkdownRenderer children={docs[Object.keys(docs)[0]]["text"]} />
      </Focusable>
      :
      <SidebarNavigation
      title={plugin}
      showTitle={true}
      pages={Object.keys(docs).map((file) => (
        {
          title: docs[file]["name"],
          content:<DocsPage content={docs[file]["text"]} />,
          route: `/decky/docs/${plugin}/${file}`,
          hideTitle: true,
        }
      ))}
    />
    }
    </>
    )
}

/*
<Focusable style={{padding:"calc(12px + 1.4vw) 2.8vw", paddingTop:"calc( 24px + var(--basicui-header-height, 0px) )"}} className="deckyDocsMarkdown">
  <ReactMarkdown children={docs[Object.keys(docs)[0]]["text"]} remarkPlugins={[remarkGfm]}/>
</Focusable>

<div className="deckyDocsMarkdown"><ReactMarkdown children={docs[file]["text"]} remarkPlugins={[remarkGfm]}/></div>
*/

export default StorePage;
