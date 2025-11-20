import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import type { WorkStatus } from "@shared/schema";

interface StatusBadgeProps {
  status: WorkStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    ELIGIBLE: {
      label: "Eligible",
      variant: "default" as const,
      icon: CheckCircle,
      className: "bg-green-600 hover:bg-green-700 text-white border-green-700",
    },
    NOT_ELIGIBLE: {
      label: "Not Eligible",
      variant: "destructive" as const,
      icon: XCircle,
      className: "",
    },
    NEEDS_REVIEW: {
      label: "Needs Review",
      variant: "secondary" as const,
      icon: AlertTriangle,
      className: "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 dark:bg-amber-950 dark:hover:bg-amber-900 dark:text-amber-100 dark:border-amber-800",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 ${config.className} ${className || ""}`}
      data-testid={`badge-status-${status.toLowerCase()}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
