import { Focusable } from 'decky-frontend-lib';
import { FunctionComponent, useRef } from 'react';
import ReactMarkdown, { Options as ReactMarkdownOptions } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps extends ReactMarkdownOptions {
  onDismiss?: () => void;
}

const Markdown: FunctionComponent<MarkdownProps> = (props) => {
  return (
    <Focusable>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          div: (nodeProps) => <Focusable {...nodeProps.node.properties}>{nodeProps.children}</Focusable>,
          a: (nodeProps) => {
            const aRef = useRef<HTMLAnchorElement>(null);
            return (
              // TODO fix focus ring
              <Focusable
                onActivate={() => {}}
                onOKButton={() => {
                  aRef?.current?.click();
                  props.onDismiss?.();
                }}
              >
                <a ref={aRef} {...nodeProps.node.properties}>
                  {nodeProps.children}
                </a>
              </Focusable>
            );
          },
        }}
        {...props}
      />
    </Focusable>
  );
};

export default Markdown;
