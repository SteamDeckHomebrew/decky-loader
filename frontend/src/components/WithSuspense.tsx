import { SteamSpinner } from 'decky-frontend-lib';
import { FunctionComponent, ReactElement, ReactNode, Suspense } from 'react';

interface WithSuspenseProps {
  children: ReactNode;
}

// Nice little wrapper around Suspense so we don't have to duplicate the styles and code for the loading spinner
const WithSuspense: FunctionComponent<WithSuspenseProps> = (props) => {
  const propsCopy = { ...props };
  delete propsCopy.children;
  (props.children as ReactElement)?.props && Object.assign((props.children as ReactElement).props, propsCopy); // There is probably a better way to do this but valve does it this way so ¯\_(ツ)_/¯
  return (
    <Suspense
      fallback={
        <div
          style={{
            marginTop: '40px',
            height: 'calc( 100% - 40px )',
            overflowY: 'scroll',
          }}
        >
          <SteamSpinner />
        </div>
      }
    >
      {props.children}
    </Suspense>
  );
};

export default WithSuspense;
