interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Controls aligned to the right of the title (filters, primary action). */
  actions?: React.ReactNode;
}

/** A view's title (the page's only h1) with an optional subtitle and actions. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="text-page-title font-semibold text-foreground">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
