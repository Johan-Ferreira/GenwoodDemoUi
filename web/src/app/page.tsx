import { redirect } from 'next/navigation';
import { OVERVIEW_PATH } from '@/lib/navigation/nav-items';

/**
 * The app root has no page of its own: it opens Overview, and the app frame
 * sends a signed-out visitor on to the sign-in screen.
 */
export default function RootPage() {
  redirect(OVERVIEW_PATH);
}
