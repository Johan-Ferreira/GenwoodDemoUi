import { AppFrame } from '@/components/app-shell/AppFrame';

/** Every signed-in view sits inside the Genwood app frame. */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppFrame>{children}</AppFrame>;
}
