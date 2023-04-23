import { FC, useEffect, useState } from 'react';
import { useParams, SidebarNavigation, SteamSpinner, Focusable } from "decky-frontend-lib";
import i18n from 'i18next';
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm';

const StorePage: FC<{}> = () => {

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
      <style>
      {`
        .deckyDocsMarkdown p {white-space: pre-wrap}
        .deckyDocsMarkdown code {background: #9999990f;}
        .deckyDocsMarkdown a {text-decoration: none;}
      `}
      </style>
      {!docs ?
        <div style={{ height: '100%' }}>
          <SteamSpinner />
        </div>
      : (Object.keys(docs).length == 1) ?
      <Focusable style={{padding:"calc(12px + 1.4vw) 2.8vw", paddingTop:"calc( 24px + var(--basicui-header-height, 0px) )"}} className="deckyDocsMarkdown">
        <ReactMarkdown children={docs[Object.keys(docs)[0]]["text"]} remarkPlugins={[remarkGfm]}/>
      </Focusable>
      :
      <SidebarNavigation
      title={plugin}
      showTitle
      pages={Object.keys(docs).map((file) => (
        {
          title: docs[file]["name"],
          content: <div className="deckyDocsMarkdown"><ReactMarkdown children={docs[file]["text"]} remarkPlugins={[remarkGfm]}/></div>,
          route: `/decky/docs/${plugin}/${file}`,
        }
      ))}
    />
    }
    </>
    )
}


export default StorePage;
