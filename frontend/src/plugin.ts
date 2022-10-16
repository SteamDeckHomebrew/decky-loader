export interface Plugin {
  name: string;
  version?: string;
  icon: JSX.Element;
  content?: JSX.Element;
  onDismount?(): void;
  alwaysRender?: boolean;
}
