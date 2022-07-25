export interface Plugin {
  name: string;
  icon: JSX.Element;
  content?: JSX.Element;
  onDismount?(): void;
}
