export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: any;
  action?: () => void;
  isDivider?: boolean;
  danger?: boolean;
}
