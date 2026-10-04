import Link from 'next/link';

import { Card } from '@/components/ui/card';

interface NotFoundMessageProps {
  /** The specific message, e.g. "File not found" (BR6). */
  message: string;
  backHref: string;
  backLabel: string;
}

/** A requested record does not exist: say so and offer the way back. */
export function NotFoundMessage({
  message,
  backHref,
  backLabel,
}: NotFoundMessageProps) {
  return (
    <Card className="items-start gap-3 p-6">
      <p className="font-medium">{message}</p>
      <Link
        href={backHref}
        className="focus-ring rounded-sm text-primary underline underline-offset-2"
      >
        {backLabel}
      </Link>
    </Card>
  );
}
