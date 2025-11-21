import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckDecisionPanel, CheckAuditTrail } from "@/components/check-components";
import { ArrowLeft, Calendar, FileText, Download, Plus, File, Pencil } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import type { EmployeeWithChecks } from "@shared/schema";

export default function EmployeeDetail() {
  const [, params] = useRoute("/employees/:id");
  const employeeId = params?.id;

  const { data: employee, isLoading } = useQuery<EmployeeWithChecks>({
    queryKey: ["/api/employees", employeeId],
    enabled: !!employeeId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-96" />
          </div>
        </main>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
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
        </main>
      </div>
    );
  }

  const sortedChecks = [...(employee.checks || [])].sort(
    (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-8">
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
                <div className="flex gap-2">
                  <Link href={`/employees/${employee.id}/edit`}>
                    <Button variant="outline" data-testid="button-edit-employee">
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
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
      </main>
    </div>
  );
}
