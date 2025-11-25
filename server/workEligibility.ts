import type { EvaluateRightToWorkInput, EvaluateRightToWorkResult } from "../lib/rightToWork";
import { evaluateRightToWork as runRulesEngine } from "../lib/rightToWork";
import type { DocumentType } from "@shared/schema";
import { mapToRulesEngineInput } from "./rightToWorkAdapter";

export type EvaluationResult = EvaluateRightToWorkResult;

/**
 * Thin wrapper that routes server-side eligibility checks through the
 * comprehensive rules engine. This keeps the decision process consistent
 * with the guardrails used in API routes and avoids overly-optimistic
 * shortcuts for titles like Fiktionsbescheinigung or employer-tied permits.
 */
export function evaluateRightToWork({
  documentType,
  expiryDate,
  dateOfIssue,
}: {
  documentType: DocumentType;
  expiryDate: string;
  dateOfIssue?: string;
}): EvaluationResult {
  const mappedInput: EvaluateRightToWorkInput = mapToRulesEngineInput({
    documentType,
    expiryDate: new Date(expiryDate),
    dateOfIssue: dateOfIssue ? new Date(dateOfIssue) : undefined,
  });

  return runRulesEngine(mappedInput);
}
