export interface Plugin {
  name: any;
  content: any;
  icon: any;
  onDismount?(): void;
}
