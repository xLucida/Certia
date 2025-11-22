import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertCircle, ChevronDown, FileText, Download, CheckCircle, XCircle, AlertTriangle, Badge as BadgeIcon } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { formatDocumentType } from "@/lib/workEligibilityUtils";
import type { RightToWorkCheck } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ELIGIBLE':
        return {
          icon: CheckCircle,
          bgClass: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
          iconClass: 'text-green-600 dark:text-green-400',
          textClass: 'text-green-900 dark:text-green-100',
          title: 'Eligible to Work',
          subtitle: 'This individual is authorized to work in Germany',
        };
      case 'NOT_ELIGIBLE':
        return {
          icon: XCircle,
          bgClass: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
          iconClass: 'text-red-600 dark:text-red-400',
          textClass: 'text-red-900 dark:text-red-100',
          title: 'Not Eligible',
          subtitle: 'Work authorization could not be confirmed',
        };
      case 'NEEDS_REVIEW':
      default:
        return {
          icon: AlertTriangle,
          bgClass: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
          iconClass: 'text-amber-600 dark:text-amber-400',
          textClass: 'text-amber-900 dark:text-amber-100',
          title: 'Needs Review',
          subtitle: 'Manual review required to confirm work eligibility',
        };
    }
  };

  const statusConfig = getStatusConfig(check.workStatus);
  const StatusIcon = statusConfig.icon;

  return (
    <Card data-testid={`card-check-${check.id}`}>
      <div className={`p-6 border-b ${statusConfig.bgClass}`}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className={`h-12 w-12 rounded-full ${statusConfig.bgClass} flex items-center justify-center border-2`}>
              <StatusIcon className={`h-6 w-6 ${statusConfig.iconClass}`} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className={`text-xl font-semibold ${statusConfig.textClass}`}>
                {statusConfig.title}
              </h3>
              {showLatestBadge && (
                <Badge variant="secondary" className="text-xs">
                  <BadgeIcon className="h-3 w-3 mr-1" />
                  Latest Check
                </Badge>
              )}
            </div>
            <p className={`text-sm mt-1 ${statusConfig.textClass} opacity-90`}>
              {statusConfig.subtitle}
            </p>
          </div>
        </div>
      </div>
      <CardHeader>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <CardTitle className="text-lg">
            {formatDocumentType(check.documentType)}
          </CardTitle>
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
            <p className="text-xs text-muted-foreground/70 mt-2 italic" data-testid="text-ai-disclaimer">
              Decision generated by Certia AI using document scan and internal rules. This is an internal screening tool and not legal advice. Always confirm right-to-work status using official documents and, where appropriate, legal counsel or the competent authorities.
            </p>
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
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-primary">Scan Insights</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {employerNameGuess && (
                    <Badge variant="secondary" className="gap-1.5">
                      <span className="text-xs text-muted-foreground">Employer:</span>
                      <span className="font-medium">{employerNameGuess}</span>
                    </Badge>
                  )}
                  {employmentPermissionGuess === 'ANY_EMPLOYMENT_ALLOWED' && (
                    <Badge variant="secondary" className="gap-1.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                      <CheckCircle className="h-3 w-3" />
                      <span>Any employment allowed</span>
                    </Badge>
                  )}
                  {employmentPermissionGuess === 'RESTRICTED' && (
                    <Badge variant="secondary" className="gap-1.5 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Restricted employment</span>
                    </Badge>
                  )}
                  {employmentPermissionGuess === 'UNKNOWN' && (
                    <Badge variant="secondary" className="gap-1.5">
                      <AlertCircle className="h-3 w-3" />
                      <span>Permission unclear</span>
                    </Badge>
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
