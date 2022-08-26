import { FunctionComponent } from 'react';
import ReactMarkdown, { Options as ReactMarkdownOptions } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Markdown: FunctionComponent<ReactMarkdownOptions> = (props) => {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} {...props} />;
};

export default Markdown;
