import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStatusInterpretation } from "@/lib/statusInterpretation";
import type { WorkStatus } from "@shared/schema";

interface StatusInterpretationProps {
  status: WorkStatus;
  className?: string;
}

export function StatusInterpretation({ status, className = "" }: StatusInterpretationProps) {
  const interpretation = getStatusInterpretation(status);

  return (
    <Card className={`bg-muted/30 border-muted-foreground/20 ${className}`} data-testid="status-interpretation">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4" />
          {interpretation.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground/90">
          {interpretation.description}
        </p>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {interpretation.bullets.map((bullet, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
