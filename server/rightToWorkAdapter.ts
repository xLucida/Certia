import type { EvaluateRightToWorkInput } from "../lib/rightToWork";
import type { DocumentType } from "@shared/schema";

/**
 * Maps our simplified check form data to the comprehensive rules engine input.
 * Uses conservative defaults that will flag most cases as NEEDS_REVIEW.
 * 
 * This is intentional - we collect minimal data in the form, so the engine
 * should be cautious and request manual review for most cases.
 */
export function mapToRulesEngineInput(formData: {
  documentType: DocumentType;
  expiryDate: Date;
  dateOfIssue?: Date;
}): EvaluateRightToWorkInput {
  // Map simplified document types to rules engine types
  const documentTypeMapping: Record<DocumentType, EvaluateRightToWorkInput['documentType']> = {
    'EU_BLUE_CARD': 'EU_BLUE_CARD',
    'EAT': 'EAT_EMPLOYMENT',
    'FIKTIONSBESCHEINIGUNG': 'FIKTIONSBESCHEINIGUNG',
    'OTHER': 'OTHER',
  };

  // Calculate documentValidFrom
  const documentValidFrom = formData.dateOfIssue 
    ? formData.dateOfIssue.toISOString().split('T')[0]
    : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Default: 1 year ago

  const documentValidTo = formData.expiryDate.toISOString().split('T')[0];

  return {
    // Assume third-country national (most conservative)
    citizenshipCategory: 'THIRD_COUNTRY',

    // Map document type
    documentType: documentTypeMapping[formData.documentType],
    documentValidFrom,
    documentValidTo,

    // Conservative: mark work permission as unclear
    // This will trigger NEEDS_REVIEW for manual verification
    employmentPermission: 'UNCLEAR',

    // Employer info - use placeholders that will trigger review
    hiringEmployerName: 'Not specified',
    permitNamesSpecificEmployer: 'UNKNOWN',

    // Occupation info - conservative defaults
    permitLimitedToOccupation: 'UNKNOWN',
    plannedRoleCategory: 'Not specified',

    // Hours - conservative defaults
    hasHoursLimitOnPermit: 'UNKNOWN',
    contractHoursPerWeek: 40, // Standard full-time

    // Location - conservative defaults
    hasLocationRestriction: 'UNKNOWN',
    plannedWorkCity: 'Not specified',

    // Blue Card specifics
    isBlueCard: formData.documentType === 'EU_BLUE_CARD',
    isChangingEmployer: true, // Conservative: assume yes
    monthsOnBlueCardInGermany: 0, // Conservative: assume new

    // Fiktionsbescheinigung specifics
    isContinuationOfSameJobAndEmployer: undefined, // Unclear

    // Free-text notes
    freeTextNotes: 'Automated evaluation based on minimal input data. Manual review recommended to verify all permit conditions.',
  };
}
