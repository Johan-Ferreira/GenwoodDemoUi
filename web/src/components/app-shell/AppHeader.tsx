import { Button } from '@/components/ui/button';
import { GenwoodLogo } from './GenwoodLogo';

interface AppHeaderProps {
  displayName: string;
  onSignOut: () => void;
}

/** The 56px Forest brand header: logo, product label, user name and Sign out. */
export function AppHeader({ displayName, onSignOut }: AppHeaderProps) {
  return (
    <header className="flex h-(--layout-header-height) shrink-0 items-center justify-between bg-brand px-5 text-brand-foreground">
      <div className="flex items-center gap-4">
        <GenwoodLogo height={36} priority />
        <span aria-hidden="true" className="h-6 w-px bg-brand-divider" />
        <span className="font-medium text-brand-label">Yield curve data</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-brand-user">{displayName}</span>
        <Button
          type="button"
          className="h-7 rounded-sm bg-brand-action px-3 text-brand-foreground hover:bg-brand-action-hover"
          onClick={onSignOut}
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
