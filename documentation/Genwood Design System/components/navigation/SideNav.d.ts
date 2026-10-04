export interface SideNavItem { id?: string; label?: string; icon?: string; count?: number; /** Renders a caps section label instead of an item. */ section?: string; }
export interface SideNavProps {
  items: SideNavItem[];
  value?: string;
  onChange?: (id: string) => void;
  footer?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function SideNav(props: SideNavProps): JSX.Element;
