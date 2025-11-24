// lib/rightToWork.ts

// High-level status the app shows to HR.
// IMPORTANT: This is a risk flag, not legal advice.
export type WorkStatus = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'NEEDS_REVIEW';

export interface EvaluateRightToWorkInput {
  // 1) Who is the person?
  citizenshipCategory: 'EU_EEA_CH' | 'THIRD_COUNTRY';

  // 2) What residence title do they hold?
  documentType:
    | 'EU_BLUE_CARD'
    | 'EAT_EMPLOYMENT'
    | 'RESIDENCE_PERMIT_EMPLOYMENT'
    | 'STUDENT_PERMIT'
    | 'JOB_SEEKER'
    | 'FIKTIONSBESCHEINIGUNG'
    | 'VISITOR_OR_NO_WORK'
    | 'OTHER';

  documentValidFrom: string; // ISO date, e.g. "2025-01-01"
  documentValidTo: string;   // ISO date

  // Optional override of "today" (for testing); otherwise use current date.
  todayIsoDate?: string;

  // 3) Does the title allow work at all?
  employmentPermission:
    | 'ANY_EMPLOYMENT_ALLOWED'        // e.g. "Erwerbstätigkeit erlaubt"
    | 'EMPLOYMENT_ALLOWED_WITH_LIMITS'// e.g. specific employer / job / hours
    | 'EMPLOYMENT_NOT_ALLOWED'
    | 'UNCLEAR';

  // 4) Employer-related info
  hiringEmployerName: string;     // your company
  permitNamesSpecificEmployer: boolean | 'UNKNOWN';
  employerOnPermit?: string;      // name printed on card/supplement

  // 5) Occupation / job-related info
  permitLimitedToOccupation: boolean | 'UNKNOWN';
  occupationOnPermit?: string;      // text from the permit, if any
  plannedRoleCategory: string;      // e.g. "Software engineer", "Nurse"

  // 6) Hours / workload
  hasHoursLimitOnPermit: boolean | 'UNKNOWN';
  hoursLimitPerWeekOnPermit?: number;  // e.g. 20
  contractHoursPerWeek: number;        // e.g. 40

  // 7) Location / region
  hasLocationRestriction: boolean | 'UNKNOWN';
  locationRestrictionDescription?: string; // text from permit remarks
  plannedWorkCity: string;                 // e.g. "Berlin"

  // 8) Blue Card–specific
  isBlueCard: boolean;                // convenience flag (usually same as documentType === 'EU_BLUE_CARD')
  isChangingEmployer: boolean;        // are they joining a NEW employer vs continuing the old one?
  monthsOnBlueCardInGermany?: number; // rough number (HR input, e.g. 6, 18, 30)

  // 9) Fiktionsbescheinigung–specific
  isContinuationOfSameJobAndEmployer?: boolean; // HR's best knowledge

  // 10) Free-text notes (for detail output)
  freeTextNotes?: string;
}

export interface EvaluateRightToWorkResult {
  workStatus: WorkStatus;
  decisionSummary: string;    // short 1–2 line summary for cards
  decisionDetails: string[];  // bullet-style reasons shown in UI
}

/**
 * Simplified German right-to-work evaluation helper.
 * This encodes conservative rules:
 * - Anything unclear → NEEDS_REVIEW
 * - Expired / clearly no work rights → NOT_ELIGIBLE
 * - Clean, straightforward cases only → ELIGIBLE
 *
 * This is NOT legal advice. It is a triage tool for HR.
 */
export function evaluateRightToWork(
  input: EvaluateRightToWorkInput
): EvaluateRightToWorkResult {
  const reasons: string[] = [];
  let status: WorkStatus = 'ELIGIBLE';

  const today = input.todayIsoDate
    ? new Date(input.todayIsoDate)
    : new Date();
  const validTo = new Date(input.documentValidTo);

  // 1) Citizenship shortcut: EU / EEA / CH
  if (input.citizenshipCategory === 'EU_EEA_CH') {
    // For EU/EEA/Swiss, valid ID + registration typically enough.
    reasons.push(
      'EU/EEA/Swiss national – generally free right to work in Germany (subject to registration obligations).'
    );
    if (validTo < today) {
      status = 'NEEDS_REVIEW';
      reasons.push('Document appears to be expired – ask for updated ID/passport.');
    }
    return {
      workStatus: status,
      decisionSummary:
        status === 'ELIGIBLE'
          ? 'Eligible to work in Germany as EU/EEA/Swiss national.'
          : 'Likely eligible as EU/EEA/Swiss national, but updated ID is required.',
      decisionDetails: reasons,
    };
  }

  // From here on: third-country nationals

  // 2) Hard stops: expiry & explicit "no employment"
  if (validTo < today) {
    status = 'NOT_ELIGIBLE';
    reasons.push('Residence title is expired – cannot be used for employment.');
    return {
      workStatus: status,
      decisionSummary: 'Not eligible – residence title expired.',
      decisionDetails: reasons,
    };
  }

  if (input.documentType === 'VISITOR_OR_NO_WORK') {
    status = 'NOT_ELIGIBLE';
    reasons.push('Residence status appears to be a visit/tourist or no-work title.');
    return {
      workStatus: status,
      decisionSummary: 'Not eligible – residence status does not permit employment.',
      decisionDetails: reasons,
    };
  }

  if (input.employmentPermission === 'EMPLOYMENT_NOT_ALLOWED') {
    status = 'NOT_ELIGIBLE';
    reasons.push('Permit explicitly does not allow employment.');
    return {
      workStatus: status,
      decisionSummary: 'Not eligible – employment not permitted by the title.',
      decisionDetails: reasons,
    };
  }

  // 3) Unclear work permission => conservative
  if (input.employmentPermission === 'UNCLEAR') {
    status = 'NEEDS_REVIEW';
    reasons.push('Work permission wording is unclear – manual review required.');
  }

  // 4) Employer-specific checks
  if (input.permitNamesSpecificEmployer === true && input.employerOnPermit) {
    const permitName = input.employerOnPermit.toLowerCase().trim();
    const hiringName = input.hiringEmployerName.toLowerCase().trim();

    if (!hiringName.includes(permitName) && !permitName.includes(hiringName)) {
      status = 'NEEDS_REVIEW';
      reasons.push(
        `Permit appears tied to a different employer ("${input.employerOnPermit}") than the hiring company ("${input.hiringEmployerName}").`
      );
    } else {
      reasons.push('Permit appears to name the same employer as the hiring company.');
    }
  } else if (input.permitNamesSpecificEmployer === 'UNKNOWN') {
    status = 'NEEDS_REVIEW';
    reasons.push('We could not determine from the information provided whether the permit is tied to a specific employer.');
  }

  // 5) Occupation / job match
  if (input.permitLimitedToOccupation === true && input.occupationOnPermit) {
    const occ = input.occupationOnPermit.toLowerCase();
    const planned = input.plannedRoleCategory.toLowerCase();

    if (!planned.includes(occ) && !occ.includes(planned)) {
      status = 'NEEDS_REVIEW';
      reasons.push(
        `Permit appears limited to occupation "${input.occupationOnPermit}", which may not match the planned role ("${input.plannedRoleCategory}").`
      );
    } else {
      reasons.push('Planned role broadly matches the occupation indicated on the permit.');
    }
  } else if (input.permitLimitedToOccupation === 'UNKNOWN') {
    status = 'NEEDS_REVIEW';
    reasons.push('We could not determine from the information provided whether the permit is limited to a specific occupation.');
  }

  // 6) Hours limits (e.g. students or restricted work)
  if (input.hasHoursLimitOnPermit === true && input.hoursLimitPerWeekOnPermit != null) {
    if (input.contractHoursPerWeek > input.hoursLimitPerWeekOnPermit) {
      status = 'NEEDS_REVIEW';
      reasons.push(
        `Contract hours (${input.contractHoursPerWeek}h/week) exceed the permitted limit (${input.hoursLimitPerWeekOnPermit}h/week).`
      );
    } else {
      reasons.push(
        `Contract hours (${input.contractHoursPerWeek}h/week) are within the stated limit (${input.hoursLimitPerWeekOnPermit}h/week).`
      );
    }
  } else if (input.hasHoursLimitOnPermit === 'UNKNOWN') {
    status = 'NEEDS_REVIEW';
    reasons.push('We could not determine from the information provided whether there is an hours-per-week limit on the permit.');
  }

  // 7) Location / region
  if (input.hasLocationRestriction === true && input.locationRestrictionDescription) {
    // Very simple check: if text clearly mentions a different city, flag.
    const desc = input.locationRestrictionDescription.toLowerCase();
    const city = input.plannedWorkCity.toLowerCase();
    if (!desc.includes(city)) {
      status = 'NEEDS_REVIEW';
      reasons.push(
        `Permit may have a regional/location restriction ("${input.locationRestrictionDescription}") that may not match the planned work location (${input.plannedWorkCity}).`
      );
    } else {
      reasons.push('Location restriction text appears to include the planned work city.');
    }
  } else if (input.hasLocationRestriction === 'UNKNOWN') {
    status = 'NEEDS_REVIEW';
    reasons.push('We could not determine from the information provided whether the permit has any regional/location restriction.');
  }

  // 8) Blue Card specifics
  if (input.isBlueCard) {
    if (input.isChangingEmployer && (input.monthsOnBlueCardInGermany ?? 0) < 12) {
      status = 'NEEDS_REVIEW';
      reasons.push(
        'EU Blue Card holder changing employer within the first year – immigration authority notification/approval is typically required.'
      );
    } else if (input.isChangingEmployer) {
      reasons.push(
        'EU Blue Card holder changing employer after 12+ months – still ensure authority has been notified according to current rules.'
      );
    } else {
      reasons.push('EU Blue Card holder continuing with same employer.');
    }
  }

  // 9) Fiktionsbescheinigung specifics
  if (input.documentType === 'FIKTIONSBESCHEINIGUNG') {
    status = 'NEEDS_REVIEW';
    if (input.isContinuationOfSameJobAndEmployer === true) {
      reasons.push(
        'Fiktionsbescheinigung – appears to continue previous work-eligible title with same job/employer. Treat as temporary extension and review carefully.'
      );
    } else if (input.isContinuationOfSameJobAndEmployer === false) {
      reasons.push(
        'Fiktionsbescheinigung with change of job/employer – work rights depend on underlying application; manual review required.'
      );
    } else {
      reasons.push(
        'Fiktionsbescheinigung – unclear whether it continues a previous work-eligible title; manual review required.'
      );
    }
  }

  // 10) Baseline explanation for "clean" cases
  if (reasons.length === 0) {
    reasons.push('No obvious red flags based on the information provided.');
  }

  let summary: string;
  if (status === 'ELIGIBLE') {
    summary = 'Likely eligible to work in Germany based on the provided residence title and conditions.';
  } else {
    // status is 'NEEDS_REVIEW' at this point (all NOT_ELIGIBLE cases return early)
    summary = 'Needs manual review – potential restrictions, missing information, or uncertainties were detected.';
  }

  return {
    workStatus: status,
    decisionSummary: summary,
    decisionDetails: reasons,
  };
}
