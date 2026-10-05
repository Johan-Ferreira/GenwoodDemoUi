import {
  ChartLine,
  Code,
  FileSpreadsheet,
  LayoutDashboard,
  Table,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

/** The landing view after every sign-in (BR3). */
export const OVERVIEW_PATH = '/overview';

export const SIGN_IN_PATH = '/sign-in';

export const FILE_LOG_PATH = '/file-log';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  /** Visible group label; null for the ungrouped first item. */
  label: string | null;
  items: NavItem[];
}

/** Six destinations in two groups (brief: Navigation model). */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ label: 'Overview', href: OVERVIEW_PATH, icon: LayoutDashboard }],
  },
  {
    label: 'Data',
    items: [
      { label: 'File log', href: FILE_LOG_PATH, icon: FileSpreadsheet },
      { label: 'Curve data', href: '/curve-data', icon: Table },
      { label: 'Yield curves', href: '/yield-curves', icon: ChartLine },
    ],
  },
  {
    label: 'Governance',
    items: [
      { label: 'Workflow monitor', href: '/workflow-monitor', icon: Workflow },
      // Not `/api`: Next.js reserves that prefix for route handlers by convention.
      { label: 'API', href: '/api-reference', icon: Code },
    ],
  },
];

/** True when `pathname` is the item's view or one of its sub-pages. */
export function isNavItemActive(
  href: string,
  pathname: string | null,
): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
