import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, CheckCircle, AlertTriangle, Plus, Eye, Search, X, Database } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import { formatDate } from "@/lib/dateUtils";
import { isExpiringSoon } from "@/lib/workEligibilityUtils";
import type { EmployeeWithChecks } from "@shared/schema";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

  const { data: standaloneChecks } = useQuery<any[]>({
    queryKey: ["/api/checks/standalone"],
    enabled: isAuthenticated,
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/demo/seed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checks/standalone"] });
      toast({
        title: "Demo data seeded",
        description: "Sample employees and checks have been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed demo data. Please try again.",
        variant: "destructive",
      });
    },
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

  // Combine employees with checks and standalone checks into unified view
  const employeesWithLatestCheck = employees?.map(emp => ({
    ...emp,
    latestCheck: emp.checks?.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    )[0],
    isStandalone: false,
  })) || [];

  // Map standalone checks to look like employee rows
  const standaloneCheckRows = standaloneChecks?.map(check => ({
    id: check.id,
    firstName: check.firstName || "",
    lastName: check.lastName || "",
    email: null,
    nationality: null,
    dateOfBirth: null,
    userId: check.userId,
    createdAt: check.createdAt,
    updatedAt: check.updatedAt,
    checks: [check],
    latestCheck: check,
    isStandalone: true,
  })) || [];

  // Combine both types
  const allRows = [...employeesWithLatestCheck, ...standaloneCheckRows];

  const totalEmployees = employees?.length || 0;
  const eligibleCount = allRows.filter(
    row => row.latestCheck?.workStatus === "ELIGIBLE"
  ).length;
  
  const expiringSoon = allRows.filter(
    row => row.latestCheck?.expiryDate && isExpiringSoon(row.latestCheck.expiryDate)
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">Dashboard</h1>
            <div className="flex gap-2">
              {import.meta.env.MODE !== 'production' && (
                <Button 
                  variant="outline" 
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  data-testid="button-seed-demo"
                >
                  <Database className="h-4 w-4 mr-2" />
                  {seedMutation.isPending ? "Seeding..." : "Seed Demo Data"}
                </Button>
              )}
              <Link href="/employees/new">
                <Button data-testid="button-add-employee">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-l-4 border-l-primary/40 bg-gradient-to-br from-card to-background">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Employees</CardTitle>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-bold tracking-tight" data-testid="text-total-employees">{totalEmployees}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Active employee records
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-accent/60 bg-gradient-to-br from-card to-background">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Eligible Workers</CardTitle>
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-accent" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-bold tracking-tight text-accent" data-testid="text-eligible-count">{eligibleCount}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Currently authorized to work
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500/60 bg-gradient-to-br from-card to-background">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Expiring Soon</CardTitle>
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-bold tracking-tight text-amber-600 dark:text-amber-500" data-testid="text-expiring-count">{expiringSoon.length}</div>
                <p className="text-sm text-muted-foreground mt-2">
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
              {allRows.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-6">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">Start Managing Work Eligibility</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Add your first employee to begin tracking right-to-work documentation and ensure compliance with German visa regulations.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-5 w-5 text-accent mt-0.5" />
                      <span>Track visa documents</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-5 w-5 text-accent mt-0.5" />
                      <span>Automated compliance checks</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-5 w-5 text-accent mt-0.5" />
                      <span>Expiry notifications</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/employees/new">
                      <Button size="lg" data-testid="button-add-first-employee">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Employee
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="table-employees">
                    <thead className="border-b bg-muted/30">
                      <tr className="text-left">
                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employee</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document Type</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expiry Date</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {allRows.map((row, index) => {
                        const initials = `${row.firstName[0]}${row.lastName[0]}`.toUpperCase();
                        return (
                          <tr 
                            key={row.id} 
                            className={`hover-elevate active-elevate-2 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                            data-testid={`row-${row.isStandalone ? 'candidate' : 'employee'}-${row.id}`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm" data-testid={`text-name-${row.id}`}>
                                      {row.firstName} {row.lastName}
                                    </span>
                                    {row.isStandalone && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground">
                                        Candidate
                                      </span>
                                    )}
                                  </div>
                                  {row.dateOfBirth && (
                                    <div className="text-xs text-muted-foreground">
                                      Born {formatDate(row.dateOfBirth)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-mono text-foreground">
                                {row.latestCheck?.documentType.replace(/_/g, ' ') || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {row.latestCheck ? (
                                <StatusBadge status={row.latestCheck.workStatus} />
                              ) : (
                                <span className="text-sm text-muted-foreground">No check</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-mono tabular-nums">
                                {formatDate(row.latestCheck?.expiryDate)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Link href={row.isStandalone ? `/checks/${row.id}` : `/employees/${row.id}`}>
                                  <Button variant="ghost" size="sm" data-testid={`button-view-${row.id}`}>
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
