import { FC, useEffect, useState } from 'react';
import { useParams, SidebarNavigation, SteamSpinner } from "decky-frontend-lib";
import i18n from 'i18next';
import ReactMarkdown from 'react-markdown'

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
        .deckyMarkdown p {white-space: pre-wrap}
        .deckyMarkdown code {background: #9999990f;}
      `}
      </style>
      {!docs ? (
        <div style={{ height: '100%' }}>
          <SteamSpinner />
        </div>
      ) :
      <SidebarNavigation
      title={plugin}
      showTitle
      pages={Object.keys(docs).map((file) => (
        {
          title: docs[file]["name"],
          content: <div className="deckyMarkdown"><ReactMarkdown children={docs[file]["text"]}/></div>,
          route: `/decky/docs/${plugin}/${file}`,
        }
      ))}
    />
    }
    </>
    )
}

/*
        {
          title: "Page 1",
          content: <ReactMarkdown>*testing 1 2 3*</ReactMarkdown>,
          route: `/decky/docs/${plugin}/1`,
        },
*/

export default StorePage;
