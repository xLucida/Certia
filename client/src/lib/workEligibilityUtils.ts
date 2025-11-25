import type { DocumentType } from "@shared/schema";
import type {
  EvaluateRightToWorkInput,
  EvaluateRightToWorkResult,
} from "../../../lib/rightToWork";
import { evaluateRightToWork as runRulesEngine } from "../../../lib/rightToWork";

export type EvaluationResult = EvaluateRightToWorkResult;

type PreviewOverrides = Partial<
  Omit<
    EvaluateRightToWorkInput,
    | "citizenshipCategory"
    | "documentType"
    | "documentValidFrom"
    | "documentValidTo"
    | "todayIsoDate"
  >
> & {
  citizenshipCategory?: EvaluateRightToWorkInput["citizenshipCategory"];
};

/**
 * Client-side helper that mirrors the server's conservative mapping into the
 * rules engine. This avoids optimistic shortcuts when rendering previews or
 * local UI, ensuring the same guardrails as the backend.
 */
export function evaluateRightToWork({
  documentType,
  expiryDate,
  dateOfIssue,
  overrides,
}: {
  documentType: DocumentType;
  expiryDate: string;
  dateOfIssue?: string;
  overrides?: PreviewOverrides;
}): EvaluationResult {
  const documentValidFrom = (dateOfIssue
    ? new Date(dateOfIssue)
    : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  )
    .toISOString()
    .split("T")[0];

  const input: EvaluateRightToWorkInput = {
    citizenshipCategory: overrides?.citizenshipCategory ?? "THIRD_COUNTRY",
    documentType: documentTypeMapping[documentType],
    documentValidFrom,
    documentValidTo: new Date(expiryDate).toISOString().split("T")[0],
    employmentPermission: overrides?.employmentPermission ?? "UNCLEAR",
    hiringEmployerName: overrides?.hiringEmployerName ?? "Not specified",
    permitNamesSpecificEmployer: overrides?.permitNamesSpecificEmployer ?? "UNKNOWN",
    employerOnPermit: overrides?.employerOnPermit,
    permitLimitedToOccupation: overrides?.permitLimitedToOccupation ?? "UNKNOWN",
    occupationOnPermit: overrides?.occupationOnPermit,
    plannedRoleCategory: overrides?.plannedRoleCategory ?? "Not specified",
    hasHoursLimitOnPermit: overrides?.hasHoursLimitOnPermit ?? "UNKNOWN",
    hoursLimitPerWeekOnPermit: overrides?.hoursLimitPerWeekOnPermit,
    contractHoursPerWeek: overrides?.contractHoursPerWeek ?? 0,
    hasLocationRestriction: overrides?.hasLocationRestriction ?? "UNKNOWN",
    locationRestrictionDescription: overrides?.locationRestrictionDescription,
    plannedWorkCity: overrides?.plannedWorkCity ?? "Not specified",
    isBlueCard: overrides?.isBlueCard ?? documentType === "EU_BLUE_CARD",
    isChangingEmployer: overrides?.isChangingEmployer ?? false,
    monthsOnBlueCardInGermany: overrides?.monthsOnBlueCardInGermany,
    isContinuationOfSameJobAndEmployer: overrides?.isContinuationOfSameJobAndEmployer,
    freeTextNotes:
      overrides?.freeTextNotes ||
      "Front-end preview using provided inputs; verify permit conditions manually.",
  };

  return runRulesEngine(input);
}

const documentTypeMapping: Record<DocumentType, EvaluateRightToWorkInput["documentType"]> = {
  EU_BLUE_CARD: "EU_BLUE_CARD",
  EAT: "EAT_EMPLOYMENT",
  FIKTIONSBESCHEINIGUNG: "FIKTIONSBESCHEINIGUNG",
  OTHER: "OTHER",
};

export function formatDocumentType(type: DocumentType): string {
  const typeMap: Record<DocumentType, string> = {
    EU_BLUE_CARD: "EU Blue Card",
    EAT: "EAT (Employment Authorization)",
    FIKTIONSBESCHEINIGUNG: "Fiktionsbescheinigung",
    OTHER: "Other Document",
  };
  return typeMap[type];
}

export function isExpiringSoon(expiryDate: string, daysThreshold: number = 60): boolean {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry > 0 && daysUntilExpiry <= daysThreshold;
}
