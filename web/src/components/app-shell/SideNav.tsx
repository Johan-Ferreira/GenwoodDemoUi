'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV_GROUPS, isNavItemActive } from '@/lib/navigation/nav-items';

/** The 232px side navigation; the item for the current view is marked active. */
export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="w-(--layout-sidebar-width) shrink-0 border-r border-sidebar-border bg-sidebar">
      <nav aria-label="Main" className="flex flex-col gap-4 px-3 py-4">
        {NAV_GROUPS.map((group, groupIndex) => {
          const labelId = group.label ? `nav-group-${groupIndex}` : undefined;
          return (
            <div key={group.label ?? 'top'} className="flex flex-col gap-1">
              {group.label && (
                <p
                  id={labelId}
                  className="px-3 pb-1 text-overline font-semibold uppercase tracking-overline text-muted-foreground"
                >
                  {group.label}
                </p>
              )}
              <ul aria-labelledby={labelId} className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isNavItemActive(item.href, pathname);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'focus-ring flex h-9 items-center gap-2.5 rounded-md px-3 transition-colors',
                          active
                            ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <Icon
                          aria-hidden="true"
                          className="size-[18px] shrink-0"
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
