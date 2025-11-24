import type { WorkStatus } from "@shared/schema";

export interface StatusGuidance {
  title: string;
  description: string;
  bullets: string[];
}

export function getStatusInterpretation(status: WorkStatus): StatusGuidance {
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
