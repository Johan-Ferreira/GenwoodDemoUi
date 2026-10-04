import type { Metadata } from 'next';
import { PageHeader } from '@/components/app-shell/PageHeader';

export const metadata: Metadata = { title: 'Overview' };

/** Placeholder: the Overview epic replaces this content. */
export default function OverviewPage() {
  return <PageHeader title="Overview" />;
}
