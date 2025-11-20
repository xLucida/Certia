import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, CheckCircle, AlertTriangle, Plus, Eye, Search, X } from "lucide-react";
import { Link } from "wouter";
import { formatDate } from "@/lib/dateUtils";
import { isExpiringSoon } from "@/lib/workEligibilityUtils";
import type { EmployeeWithChecks } from "@shared/schema";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [documentType, setDocumentType] = useState<string>("");
  const [expiryFrom, setExpiryFrom] = useState<string>("");
  const [expiryTo, setExpiryTo] = useState<string>("");

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status) params.append("status", status);
    if (documentType) params.append("documentType", documentType);
    if (expiryFrom) params.append("expiryFrom", expiryFrom);
    if (expiryTo) params.append("expiryTo", expiryTo);
    return params.toString();
  };

  const { data: employees, isLoading, error } = useQuery<EmployeeWithChecks[]>({
    queryKey: ["/api/employees", search, status, documentType, expiryFrom, expiryTo],
    queryFn: async () => {
      const queryString = buildQueryString();
      const url = `/api/employees${queryString ? `?${queryString}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch employees");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="space-y-8">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </main>
      </div>
    );
  }

  if (error && isUnauthorizedError(error as Error)) {
    return null;
  }

  const employeesWithLatestCheck = employees?.map(emp => ({
    ...emp,
    latestCheck: emp.checks?.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    )[0],
  })) || [];

  const totalEmployees = employees?.length || 0;
  const eligibleCount = employeesWithLatestCheck.filter(
    emp => emp.latestCheck?.workStatus === "ELIGIBLE"
  ).length;
  
  const expiringSoon = employeesWithLatestCheck.filter(
    emp => emp.latestCheck?.expiryDate && isExpiringSoon(emp.latestCheck.expiryDate)
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">Dashboard</h1>
            <Link href="/employees/new">
              <Button data-testid="button-add-employee">
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold" data-testid="text-total-employees">{totalEmployees}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active employee records
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eligible Workers</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold" data-testid="text-eligible-count">{eligibleCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently authorized to work
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold" data-testid="text-expiring-count">{expiringSoon.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Documents expiring in 60 days
                </p>
              </CardContent>
            </Card>
          </div>

          {expiringSoon.length > 0 && (
            <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-900 dark:text-amber-100">
                <p className="font-semibold mb-2">Attention Required</p>
                <p className="text-sm">
                  {expiringSoon.length} employee document{expiringSoon.length !== 1 ? 's' : ''} expiring within the next 60 days. 
                  Review and renew these documents to maintain compliance.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle>Employees & Work Status</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employees..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 w-64"
                      data-testid="input-search"
                    />
                  </div>
                  <Select value={status || "all"} onValueChange={(val) => setStatus(val === "all" ? "" : val)}>
                    <SelectTrigger className="w-40" data-testid="select-status">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="ELIGIBLE">Eligible</SelectItem>
                      <SelectItem value="NOT_ELIGIBLE">Not Eligible</SelectItem>
                      <SelectItem value="NEEDS_REVIEW">Needs Review</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={documentType || "all"} onValueChange={(val) => setDocumentType(val === "all" ? "" : val)}>
                    <SelectTrigger className="w-48" data-testid="select-document-type">
                      <SelectValue placeholder="All Document Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="EU_BLUE_CARD">EU Blue Card</SelectItem>
                      <SelectItem value="EAT">Employment Authorization</SelectItem>
                      <SelectItem value="FIKTIONSBESCHEINIGUNG">Fiktionsbescheinigung</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={expiryFrom}
                      onChange={(e) => setExpiryFrom(e.target.value)}
                      placeholder="Expiry from"
                      className="w-40"
                      data-testid="input-expiry-from"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input
                      type="date"
                      value={expiryTo}
                      onChange={(e) => setExpiryTo(e.target.value)}
                      placeholder="Expiry to"
                      className="w-40"
                      data-testid="input-expiry-to"
                    />
                  </div>
                  {(search || status || documentType || expiryFrom || expiryTo) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSearch("");
                        setStatus("");
                        setDocumentType("");
                        setExpiryFrom("");
                        setExpiryTo("");
                      }}
                      data-testid="button-clear-filters"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {employeesWithLatestCheck.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No employees added yet</p>
                  <Link href="/employees/new">
                    <Button data-testid="button-add-first-employee">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Employee
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="table-employees">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="px-4 py-3 text-sm font-medium">Employee Name</th>
                        <th className="px-4 py-3 text-sm font-medium">Document Type</th>
                        <th className="px-4 py-3 text-sm font-medium">Status</th>
                        <th className="px-4 py-3 text-sm font-medium">Expiry Date</th>
                        <th className="px-4 py-3 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeesWithLatestCheck.map((employee) => (
                        <tr 
                          key={employee.id} 
                          className="border-b hover-elevate"
                          data-testid={`row-employee-${employee.id}`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium" data-testid={`text-employee-name-${employee.id}`}>
                              {employee.firstName} {employee.lastName}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-mono">
                              {employee.latestCheck?.documentType.replace(/_/g, ' ') || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {employee.latestCheck ? (
                              <StatusBadge status={employee.latestCheck.workStatus} />
                            ) : (
                              <span className="text-sm text-muted-foreground">No check</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-mono">
                              {formatDate(employee.latestCheck?.expiryDate)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/employees/${employee.id}`}>
                              <Button variant="ghost" size="sm" data-testid={`button-view-${employee.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
