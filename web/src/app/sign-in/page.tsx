import type { Metadata } from 'next';
import { GenwoodLogo } from '@/components/app-shell/GenwoodLogo';
import { SignInButton } from './SignInButton';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default function SignInPage() {
  return (
    <div className="grid min-h-screen grid-cols-2">
      <div className="flex flex-col justify-between bg-brand p-12 text-brand-foreground">
        <GenwoodLogo height={52} priority />
        <div className="max-w-[440px]">
          <p className="text-page-title font-semibold">
            Yield curve data, governed from receipt to publication.
          </p>
          <p className="mt-3 text-base text-brand-label">
            Bank of England nominal, real, inflation and OIS curves, with a full
            audit trail for every file.
          </p>
        </div>
        <p className="text-xs text-brand-footnote">Demonstration environment</p>
      </div>

      <main className="flex items-center justify-center bg-card p-12">
        <div className="w-full max-w-[360px]">
          <h1 className="text-page-title font-semibold">Sign in</h1>
          <p className="mt-1 text-muted-foreground">
            Use your Genwood single sign-on account.
          </p>
          <div className="mt-8">
            <SignInButton />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Demo only: no credentials are checked. You will be signed in as Demo
            user.
          </p>
        </div>
      </main>
    </div>
  );
}
