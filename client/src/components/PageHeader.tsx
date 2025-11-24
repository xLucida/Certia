interface PageHeaderProps {
  title: string;
  kicker?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  kicker,
  description,
  icon,
  actions,
}: PageHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-primary/5 via-background to-background rounded-xl border p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3 min-w-0 flex-1">
          {icon && (
            <div className="flex-shrink-0 mt-1 text-muted-foreground">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {kicker && (
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {kicker}
              </div>
            )}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex-shrink-0 flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
