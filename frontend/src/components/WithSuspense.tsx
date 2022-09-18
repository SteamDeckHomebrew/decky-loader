import { Focusable, SteamSpinner } from 'decky-frontend-lib';
import { FunctionComponent, ReactElement, ReactNode, Suspense } from 'react';

interface WithSuspenseProps {
  children: ReactNode;
  route?: boolean;
}

// Nice little wrapper around Suspense so we don't have to duplicate the styles and code for the loading spinner
const WithSuspense: FunctionComponent<WithSuspenseProps> = (props) => {
  const propsCopy = { ...props };
  delete propsCopy.children;
  (props.children as ReactElement)?.props && Object.assign((props.children as ReactElement).props, propsCopy); // There is probably a better way to do this but valve does it this way so ¯\_(ツ)_/¯
  return (
    <Suspense
      fallback={
        <Focusable
          // needed to enable focus ring so that the focus properly resets on load
          onActivate={() => {}}
          style={{
            overflowY: 'scroll',
            backgroundColor: 'transparent',
            ...(props.route && {
              marginTop: '40px',
              height: 'calc( 100% - 40px )',
            }),
          }}
        >
          <SteamSpinner />
        </Focusable>
      }
    >
      {props.children}
    </Suspense>
  );
};

export default WithSuspense;
