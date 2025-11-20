import type { DocumentType, WorkStatus } from "@shared/schema";

export interface EvaluationResult {
  workStatus: WorkStatus;
  decisionSummary: string;
  decisionDetails: string;
}

/**
 * Evaluates right-to-work eligibility based on German visa documentation rules.
 * 
 * Rules:
 * - EU_BLUE_CARD or EAT:
 *   - if expiryDate > now → ELIGIBLE
 *   - else → NOT_ELIGIBLE
 * - FIKTIONSBESCHEINIGUNG:
 *   - if expiryDate > now → NEEDS_REVIEW
 *   - else → NOT_ELIGIBLE
 * - OTHER: always NEEDS_REVIEW
 */
export function evaluateRightToWork({
  documentType,
  expiryDate,
}: {
  documentType: DocumentType;
  expiryDate: string;
}): EvaluationResult {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const isExpired = expiry < now;

  if (documentType === "EU_BLUE_CARD" || documentType === "EAT") {
    if (isExpired) {
      return {
        workStatus: "NOT_ELIGIBLE",
        decisionSummary: "Document expired",
        decisionDetails: `This ${formatDocumentType(documentType)} expired on ${expiry.toLocaleDateString()}. The employee is not eligible to work in Germany.`,
      };
    } else {
      return {
        workStatus: "ELIGIBLE",
        decisionSummary: "Valid work authorization",
        decisionDetails: `This ${formatDocumentType(documentType)} is valid until ${expiry.toLocaleDateString()}. The employee is eligible to work in Germany.`,
      };
    }
  }

  if (documentType === "FIKTIONSBESCHEINIGUNG") {
    if (isExpired) {
      return {
        workStatus: "NOT_ELIGIBLE",
        decisionSummary: "Fiktionsbescheinigung expired",
        decisionDetails: `This Fiktionsbescheinigung expired on ${expiry.toLocaleDateString()}. The employee is not eligible to work in Germany.`,
      };
    } else {
      return {
        workStatus: "NEEDS_REVIEW",
        decisionSummary: "Manual review required",
        decisionDetails: `This Fiktionsbescheinigung is valid until ${expiry.toLocaleDateString()}. Manual review is required to verify work authorization conditions and restrictions.`,
      };
    }
  }

  // OTHER
  return {
    workStatus: "NEEDS_REVIEW",
    decisionSummary: "Manual review required",
    decisionDetails: `This document requires manual review to determine work eligibility. Please verify the document type and validity with German immigration authorities.`,
  };
}

function formatDocumentType(type: DocumentType): string {
  const typeMap: Record<DocumentType, string> = {
    EU_BLUE_CARD: "EU Blue Card",
    EAT: "EAT (Employment Authorization)",
    FIKTIONSBESCHEINIGUNG: "Fiktionsbescheinigung",
    OTHER: "Other Document",
  };
  return typeMap[type];
}
