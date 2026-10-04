'use client';

import { LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signInDemo } from '@/lib/session/demo-session';
import { OVERVIEW_PATH } from '@/lib/navigation/nav-items';

/** Signs in as "Demo user" (no credentials checked) and always opens Overview. */
export function SignInButton() {
  const router = useRouter();

  const handleSignIn = () => {
    signInDemo();
    router.push(OVERVIEW_PATH);
  };

  return (
    <Button
      type="button"
      size="lg"
      className="h-11 w-full"
      onClick={handleSignIn}
    >
      <LogIn aria-hidden="true" />
      Sign in with Genwood SSO
    </Button>
  );
}
