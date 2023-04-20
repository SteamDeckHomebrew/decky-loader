import { FC, SVGProps } from 'react';

interface ChevronProps extends SVGProps<SVGSVGElement> {
  direction: 'up' | 'down' | 'left' | 'right';
}

const Chevron: FC<ChevronProps> = ({ direction, ...rest }) => {
  let d: string;
  switch (direction) {
    case 'up':
      d = 'M17.98 10.23L3.20996 25H32.75L17.98 10.23Z';
      break;
    case 'down':
      d = 'M17.98 26.54L3.20996 11.77H32.75L17.98 26.54Z';
      break;
    case 'left':
      d = 'M9.82497 18.385L24.595 3.61499L24.595 33.155L9.82497 18.385Z';
      break;
    case 'right':
      d = 'M26.135 18.385L11.365 33.155L11.365 3.61503L26.135 18.385Z';
      break;
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none" {...rest}>
      <path d={d} fill="currentColor" />
    </svg>
  );
};

export default Chevron;
