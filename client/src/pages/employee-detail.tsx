import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckDecisionPanel, CheckAuditTrail } from "@/components/check-components";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusInterpretation } from "@/components/StatusInterpretation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calendar, FileText, Download, Plus, File, Pencil, Link2, Check, Clock, Printer, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { formatDocumentType } from "@/lib/workEligibilityUtils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { EmployeeWithChecks } from "@shared/schema";

export default function EmployeeDetail() {
  const [, params] = useRoute("/employees/:id");
  const employeeId = params?.id;
  const { toast } = useToast();
  const [linkCopied, setLinkCopied] = useState(false);
  const [showStatusInterpretation, setShowStatusInterpretation] = useState(false);

  const { data: employee, isLoading } = useQuery<EmployeeWithChecks>({
    queryKey: ["/api/employees", employeeId],
    enabled: !!employeeId,
  });

  const generateLinkMutation = useMutation({
    mutationFn: async (empId: string) => {
      const response = await apiRequest("POST", "/api/public-upload/link", { 
        employeeId: empId, 
        expiresInDays: 14 
      });
      return await response.json();
    },
    onSuccess: async (data) => {
      const fullUrl = `${window.location.origin}${data.urlPath}`;
      try {
        await navigator.clipboard.writeText(fullUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
        toast({
          title: "Upload Link Copied",
          description: "The secure upload link has been copied to your clipboard. Valid for 14 days.",
        });
      } catch (err) {
        toast({
          title: "Link Generated",
          description: fullUrl,
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to Generate Link",
        description: error.message || "Could not create upload link. Please try again.",
      });
    },
  });

  const handleRequestDocuments = () => {
    if (employeeId) {
      generateLinkMutation.mutate(employeeId);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Employee not found</p>
            <Link href="/employees">
              <Button className="mt-4" variant="outline">
                Back to Employees
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedChecks = [...(employee.checks || [])].sort(
    (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
  );

  const reportDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const statusCounts = {
    ELIGIBLE: sortedChecks.filter(c => c.workStatus === 'ELIGIBLE').length,
    NOT_ELIGIBLE: sortedChecks.filter(c => c.workStatus === 'NOT_ELIGIBLE').length,
    NEEDS_REVIEW: sortedChecks.filter(c => c.workStatus === 'NEEDS_REVIEW').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block mb-8">
        <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Certia</h1>
          <h2 className="text-xl font-semibold text-gray-700 mt-2">Employee Audit Report</h2>
          <p className="text-sm text-gray-600 mt-1">Report Date: {reportDate}</p>
        </div>
      </div>

      <div className="space-y-8">
          <div className="flex items-center gap-4 print:hidden">
            <Link href="/employees">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-2xl mb-2" data-testid="text-employee-name">
                    {employee.firstName} {employee.lastName}
                  </CardTitle>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {employee.dateOfBirth && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Born: {formatDate(employee.dateOfBirth)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.print()}
                    data-testid="button-print-employee-audit"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Employee Audit Report
                  </Button>
                  <Link href={`/employees/${employee.id}/edit`}>
                    <Button variant="outline" data-testid="button-edit-employee">
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={handleRequestDocuments}
                    disabled={generateLinkMutation.isPending}
                    data-testid="button-request-documents"
                  >
                    {linkCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Link Copied
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Request Documents
                      </>
                    )}
                  </Button>
                  <Link href={`/checks/new?employeeId=${employee.id}`}>
                    <Button data-testid="button-add-check">
                      <Plus className="h-4 w-4 mr-2" />
                      New Check
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            {employee.notes && (
              <CardContent>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Notes</h3>
                  <p className="text-sm text-muted-foreground">{employee.notes}</p>
                </div>
              </CardContent>
            )}
          </Card>

          {sortedChecks.length > 0 && (
            <Card className="border-2 bg-gradient-to-br from-card to-background print:bg-white print:border-gray-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Right-to-Work Status Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider print:text-gray-600">Latest Status</p>
                    <StatusBadge status={sortedChecks[0].workStatus} />
                  </div>
                  {sortedChecks[0].expiryDate && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider print:text-gray-600">Next Expiry</p>
                      <div className="space-y-1">
                        <p className="text-lg font-semibold print:text-gray-900" data-testid="text-next-expiry">
                          {formatDate(sortedChecks[0].expiryDate)}
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground print:hidden" />
                          <span className="text-muted-foreground print:text-gray-700" data-testid="text-expiry-countdown">
                            {(() => {
                              const today = new Date();
                              const expiry = new Date(sortedChecks[0].expiryDate);
                              const diffTime = expiry.getTime() - today.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              
                              if (diffDays < 0) {
                                return (
                                  <span className="text-red-600 dark:text-red-400 font-medium print:text-red-700">
                                    Expired {Math.abs(diffDays)} day{Math.abs(diffDays) !== 1 ? 's' : ''} ago
                                  </span>
                                );
                              } else if (diffDays === 0) {
                                return <span className="text-amber-600 dark:text-amber-400 font-medium print:text-amber-700">Expires today</span>;
                              } else if (diffDays <= 60) {
                                return (
                                  <span className="text-amber-600 dark:text-amber-400 font-medium print:text-amber-700">
                                    Expires in {diffDays} day{diffDays !== 1 ? 's' : ''}
                                  </span>
                                );
                              } else {
                                return <span className="text-muted-foreground print:text-gray-700">Expires in {diffDays} day{diffDays !== 1 ? 's' : ''}</span>;
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Print-only summary table */}
                <div className="hidden print:block mt-6 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-3">Check Summary</p>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Checks</p>
                      <p className="text-lg font-semibold text-gray-900">{sortedChecks.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Eligible</p>
                      <p className="text-lg font-semibold text-green-700">{statusCounts.ELIGIBLE}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Not Eligible</p>
                      <p className="text-lg font-semibold text-red-700">{statusCounts.NOT_ELIGIBLE}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Needs Review</p>
                      <p className="text-lg font-semibold text-amber-700">{statusCounts.NEEDS_REVIEW}</p>
                    </div>
                  </div>
                </div>

                {/* Collapsible status interpretation - screen only */}
                <div className="print:hidden mt-6 pt-4 border-t border-muted">
                  <button
                    onClick={() => setShowStatusInterpretation(!showStatusInterpretation)}
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    data-testid="button-toggle-status-interpretation"
                  >
                    {showStatusInterpretation ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    How to interpret this status
                  </button>
                  {showStatusInterpretation && (
                    <div className="mt-4">
                      <StatusInterpretation status={sortedChecks[0].workStatus} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Print-only checks table */}
          {sortedChecks.length > 0 && (
            <Card className="hidden print:block print:bg-white print:border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg">All Right-to-Work Checks</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="print:text-gray-700">Check ID</TableHead>
                      <TableHead className="print:text-gray-700">Created</TableHead>
                      <TableHead className="print:text-gray-700">Status</TableHead>
                      <TableHead className="print:text-gray-700">Document Type</TableHead>
                      <TableHead className="print:text-gray-700">Expiry Date</TableHead>
                      <TableHead className="print:text-gray-700">Summary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedChecks.map((check) => (
                      <TableRow key={check.id} className="print:border-gray-200">
                        <TableCell className="font-mono text-xs print:text-gray-900">{check.id.substring(0, 8)}</TableCell>
                        <TableCell className="text-sm print:text-gray-900">{formatDate(check.createdAt instanceof Date ? check.createdAt.toISOString() : check.createdAt)}</TableCell>
                        <TableCell className="text-sm">
                          <span className={`
                            ${check.workStatus === 'ELIGIBLE' ? 'text-green-700' : ''}
                            ${check.workStatus === 'NOT_ELIGIBLE' ? 'text-red-700' : ''}
                            ${check.workStatus === 'NEEDS_REVIEW' ? 'text-amber-700' : ''}
                            font-medium
                          `}>
                            {check.workStatus === 'ELIGIBLE' ? 'Eligible' : ''}
                            {check.workStatus === 'NOT_ELIGIBLE' ? 'Not Eligible' : ''}
                            {check.workStatus === 'NEEDS_REVIEW' ? 'Needs Review' : ''}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm print:text-gray-900">{formatDocumentType(check.documentType)}</TableCell>
                        <TableCell className="text-sm print:text-gray-900">{check.expiryDate ? formatDate(check.expiryDate) : '—'}</TableCell>
                        <TableCell className="text-xs print:text-gray-700 max-w-xs truncate">{check.decisionSummary || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4 print:hidden">
            <h2 className="text-xl font-semibold">Right-to-Work Check History</h2>
            
            {sortedChecks.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No checks recorded yet</p>
                  <Link href={`/checks/new?employeeId=${employee.id}`}>
                    <Button data-testid="button-add-first-check">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Check
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sortedChecks.map((check, index) => (
                  <div key={check.id} className="space-y-4">
                    <CheckDecisionPanel check={check} showLatestBadge={index === 0} />
                    <CheckAuditTrail check={check} />
                    {check.fileUrl && (
                      <div className="pt-2">
                        <a 
                          href={check.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                          data-testid={`link-download-${check.id}`}
                        >
                          <File className="h-4 w-4" />
                          <span>View Uploaded Document</span>
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
