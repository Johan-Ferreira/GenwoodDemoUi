import type { ComponentProps, ReactNode } from 'react';

import { Button } from '@/components/ui/button';

type ButtonProps = ComponentProps<typeof Button>;

export interface IconButtonProps extends Omit<
  ButtonProps,
  'aria-label' | 'children'
> {
  /** Required text label: the button's accessible name and hover hint. */
  label: string;
  /** The icon; mark it `aria-hidden="true"`. */
  children: ReactNode;
}

/**
 * An icon-only button that screen readers announce by its text label (R12).
 * Defaults to the ghost variant at icon size.
 */
export function IconButton({
  label,
  children,
  variant = 'ghost',
  size = 'icon',
  type = 'button',
  title,
  ...props
}: IconButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      aria-label={label}
      title={title ?? label}
      {...props}
    >
      {children}
    </Button>
  );
}
