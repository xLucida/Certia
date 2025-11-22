import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckDecisionPanel, CheckAuditTrail } from "@/components/check-components";
import { ArrowLeft, Calendar, FileText, Download, Plus, File, Pencil, Link2, Check } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { EmployeeWithChecks } from "@shared/schema";

export default function EmployeeDetail() {
  const [, params] = useRoute("/employees/:id");
  const employeeId = params?.id;
  const { toast } = useToast();
  const [linkCopied, setLinkCopied] = useState(false);

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

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="space-y-8">
          <div className="flex items-center gap-4">
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

          <div className="space-y-4">
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
