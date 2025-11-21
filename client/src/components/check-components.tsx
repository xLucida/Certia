import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertCircle, ChevronDown, FileText, Download } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { formatDocumentType } from "@/lib/workEligibilityUtils";
import type { RightToWorkCheck } from "@shared/schema";

interface CheckDecisionPanelProps {
  check: RightToWorkCheck;
  showLatestBadge?: boolean;
}

export function CheckDecisionPanel({ check, showLatestBadge = false }: CheckDecisionPanelProps) {
  const missingInfo = check.decisionDetails?.filter((detail: string) =>
    detail.startsWith('We could not determine from the information provided')
  ) || [];
  const regularDetails = check.decisionDetails?.filter((detail: string) =>
    !detail.startsWith('We could not determine from the information provided')
  ) || [];

  return (
    <Card data-testid={`card-check-${check.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <StatusBadge status={check.workStatus} />
              {showLatestBadge && (
                <span className="text-xs text-muted-foreground">Latest</span>
              )}
            </div>
            <CardTitle className="text-lg">
              {formatDocumentType(check.documentType)}
            </CardTitle>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Created {check.createdAt ? formatDate(check.createdAt instanceof Date ? check.createdAt.toISOString() : check.createdAt) : '—'}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {check.documentNumber && (
            <div>
              <p className="text-muted-foreground">Document Number</p>
              <p className="font-mono font-medium">{check.documentNumber}</p>
            </div>
          )}
          {check.countryOfIssue && (
            <div>
              <p className="text-muted-foreground">Country of Issue</p>
              <p className="font-medium">{check.countryOfIssue}</p>
            </div>
          )}
          {check.dateOfIssue && (
            <div>
              <p className="text-muted-foreground">Issue Date</p>
              <p className="font-mono">{formatDate(check.dateOfIssue)}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Expiry Date</p>
            <p className="font-mono font-medium">{formatDate(check.expiryDate)}</p>
          </div>
        </div>

        {check.decisionSummary && (
          <div>
            <p className="text-sm font-medium mb-1">Decision Summary</p>
            <p className="text-sm text-muted-foreground">{check.decisionSummary}</p>
          </div>
        )}

        {(regularDetails.length > 0 || missingInfo.length > 0) && (
          <div className="space-y-4">
            {regularDetails.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Decision Details</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {regularDetails.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}

            {missingInfo.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 border border-muted-foreground/20">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  Missing Information
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {missingInfo.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground leading-relaxed">
            This is an internal screening tool and not legal advice. Always confirm right-to-work status using official documents and, where appropriate, legal counsel or the competent authorities.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface CheckAuditTrailProps {
  check: RightToWorkCheck;
}

export function CheckAuditTrail({ check }: CheckAuditTrailProps) {
  if (!check.ocrRawText && !check.ocrExtractedFields) {
    return null;
  }

  let extractedFieldsObj = null;
  try {
    if (check.ocrExtractedFields) {
      if (typeof check.ocrExtractedFields === 'string') {
        extractedFieldsObj = JSON.parse(check.ocrExtractedFields);
      } else {
        extractedFieldsObj = check.ocrExtractedFields;
      }
    }
  } catch (e) {
    console.error('Failed to parse OCR extracted fields', e);
  }

  const employerNameGuess = extractedFieldsObj?.employerNameGuess as string | undefined;
  const employmentPermissionGuess = extractedFieldsObj?.employmentPermissionGuess as
    | 'ANY_EMPLOYMENT_ALLOWED'
    | 'RESTRICTED'
    | 'UNKNOWN'
    | undefined;

  const hasInsights = employerNameGuess || employmentPermissionGuess;

  const getPermissionLabel = (permission: typeof employmentPermissionGuess): string => {
    switch (permission) {
      case 'ANY_EMPLOYMENT_ALLOWED':
        return 'Employment permission: likely any employment allowed';
      case 'RESTRICTED':
        return 'Employment permission: likely restricted (e.g. employer/role-specific)';
      case 'UNKNOWN':
        return 'Employment permission: not clear from the scan';
      default:
        return '';
    }
  };

  return (
    <Collapsible>
      <CollapsibleTrigger className="w-full">
        <Card className="hover-elevate">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Document Scan Details</CardTitle>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2">
          <CardContent className="pt-6 space-y-4">
            {hasInsights && (
              <div className="p-3 rounded-lg bg-muted/30 border border-muted">
                <p className="text-sm font-medium mb-2">Scan Insights</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {employerNameGuess && (
                    <p>Possible employer name: <span className="font-medium">{employerNameGuess}</span></p>
                  )}
                  {employmentPermissionGuess && (
                    <p>{getPermissionLabel(employmentPermissionGuess)}</p>
                  )}
                </div>
              </div>
            )}
            {extractedFieldsObj && (
              <div>
                <p className="text-sm font-medium mb-2">Extracted Fields</p>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                  {JSON.stringify(extractedFieldsObj, null, 2)}
                </pre>
              </div>
            )}
            {check.ocrRawText && (
              <div>
                <p className="text-sm font-medium mb-2">Raw OCR Text</p>
                <div className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-48">
                  {check.ocrRawText}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface CheckDocumentDownloadProps {
  check: RightToWorkCheck;
  onDownload: () => void;
}

export function CheckDocumentDownload({ check, onDownload }: CheckDocumentDownloadProps) {
  if (!check.fileUrl) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <FileText className="h-4 w-4" />
      <button
        onClick={onDownload}
        className="hover:underline"
        data-testid={`button-download-${check.id}`}
      >
        <Download className="h-4 w-4 inline mr-1" />
        Download Document
      </button>
    </div>
  );
}
