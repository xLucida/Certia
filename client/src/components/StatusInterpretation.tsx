import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type WorkStatus = "ELIGIBLE" | "NOT_ELIGIBLE" | "NEEDS_REVIEW";

interface StatusInterpretationData {
  title: string;
  description: string;
  bullets: string[];
}

export function getStatusInterpretation(status: WorkStatus): StatusInterpretationData {
  switch (status) {
    case "ELIGIBLE":
      return {
        title: "What ELIGIBLE usually means",
        description: "Based on the current documents, this person appears eligible to work in Germany under the conditions shown.",
        bullets: [
          "Verify that the scanned document matches the original.",
          "Check that the job offer respects any occupation or employer limitations.",
          "Track the expiry date and schedule a follow-up check before it expires."
        ]
      };
    
    case "NOT_ELIGIBLE":
      return {
        title: "What NOT ELIGIBLE usually means",
        description: "Based on the current documents, this person does not appear eligible to work in Germany.",
        bullets: [
          "Do not start or continue employment based solely on this permit.",
          "Confirm with the candidate whether they have other valid documents.",
          "Consider contacting legal counsel or the local immigration authority if this is unexpected."
        ]
      };
    
    case "NEEDS_REVIEW":
      return {
        title: "What NEEDS REVIEW usually means",
        description: "There are missing details, possible restrictions, or AI/rules conflicts. A human review is required before any decision.",
        bullets: [
          "Carefully review the original document text (not just the scan).",
          "Clarify unclear conditions such as employer, hours, or region.",
          "Escalate to HR legal/compliance if you are unsure."
        ]
      };
  }
}

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
