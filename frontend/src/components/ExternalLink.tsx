import { Navigation } from '@decky/ui';
import { AnchorHTMLAttributes, FC } from 'react';

const ExternalLink: FC<AnchorHTMLAttributes<HTMLAnchorElement>> = (props) => {
  return (
    <a
      {...props}
      onClick={(e) => {
        e.preventDefault();
        props.onClick ? props.onClick(e) : props.href && Navigation.NavigateToExternalWeb(props.href);
      }}
    />
  );
};

export default ExternalLink;
