import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, CheckCircle, AlertTriangle, Plus, Eye, Search, X, Database, Download } from "lucide-react";
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

  const [resolvedCaseIds, setResolvedCaseIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("rtwde_resolved_case_ids");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("rtwde_resolved_case_ids", JSON.stringify(resolvedCaseIds));
    } catch {
      // ignore
    }
  }, [resolvedCaseIds]);

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
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
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

  const casesRequiringReview = allRows.filter(row => 
    row.latestCheck && (row.latestCheck.workStatus === "NEEDS_REVIEW" || row.latestCheck.workStatus === "NOT_ELIGIBLE")
  );

  const openCases = casesRequiringReview.filter(row => {
    const checkId = row.latestCheck?.id;
    return checkId && !resolvedCaseIds.includes(checkId);
  });

  const resolvedCases = casesRequiringReview.filter(row => {
    const checkId = row.latestCheck?.id;
    return checkId && resolvedCaseIds.includes(checkId);
  });

  const handleViewExpiringDocs = () => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 60);
    
    setExpiryFrom(today.toISOString().split('T')[0]);
    setExpiryTo(futureDate.toISOString().split('T')[0]);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="space-y-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Overview of employees, right-to-work checks, and upcoming visa expiries.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
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
              <Button
                variant="outline"
                onClick={() => {
                  window.open("/api/checks/export", "_blank");
                }}
                data-testid="button-export-checks"
              >
                <Download className="h-4 w-4 mr-2" />
                Export checks (CSV)
              </Button>
              <Link href="/employees/new">
                <Button data-testid="button-add-employee">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="card-hover border-l-4 border-l-primary/40 bg-gradient-to-br from-card to-background shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Total Employees</CardTitle>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-bold tracking-tight" data-testid="text-total-employees">{totalEmployees}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Active employee records
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover border-l-4 border-l-accent/60 bg-gradient-to-br from-card to-background shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Eligible Workers</CardTitle>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-accent" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-bold tracking-tight text-accent" data-testid="text-eligible-count">{eligibleCount}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Currently authorized to work
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover border-l-4 border-l-amber-500/60 bg-gradient-to-br from-card to-background shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Expiring Soon</CardTitle>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-500" />
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
                <p className="text-sm mb-3">
                  {expiringSoon.length} employee document{expiringSoon.length !== 1 ? 's' : ''} expiring within the next 60 days. 
                  Review and renew these documents to maintain compliance.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleViewExpiringDocs}
                  className="bg-white dark:bg-background hover:bg-white/90 dark:hover:bg-background/90"
                  data-testid="button-view-expiring-docs"
                >
                  View expiring documents
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-2 shadow-sm bg-gradient-to-br from-card to-background">
            <CardHeader className="border-b bg-amber-50/50 dark:bg-amber-950/10">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                  </div>
                  <CardTitle className="text-lg font-bold">
                    Cases requiring review
                  </CardTitle>
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  {openCases.length} open · {resolvedCases.length} resolved
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {casesRequiringReview.length === 0 && (
                <div className="flex items-center gap-3 text-muted-foreground p-4 bg-muted/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-accent" />
                  <p className="text-sm">
                    No checks currently require manual review. You&apos;re all caught up.
                  </p>
                </div>
              )}

              {openCases.length > 0 && (
                <div className="overflow-x-auto -mx-6 px-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-bold text-xs uppercase tracking-wider">Person</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">Expiry</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openCases.map((row) => {
                        const check = row.latestCheck;
                        if (!check) return null;
                        const name = `${row.firstName} ${row.lastName}`.trim() || "Unnamed";
                        return (
                          <TableRow key={check.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-case-${check.id}`}>
                            <TableCell className="font-medium">{name}</TableCell>
                            <TableCell>
                              <StatusBadge status={check.workStatus} />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {check.expiryDate ? formatDate(check.expiryDate) : "—"}
                            </TableCell>
                            <TableCell className="flex flex-wrap gap-2">
                              <Link href={row.isStandalone ? `/checks/${check.id}` : `/employees/${row.id}`}>
                                <Button variant="outline" size="sm" className="button-transition" data-testid={`button-view-case-${check.id}`}>
                                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                                  View
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="button-transition"
                                onClick={() => {
                                  const checkId = check.id;
                                  setResolvedCaseIds(prev =>
                                    prev.includes(checkId) ? prev : [...prev, checkId]
                                  );
                                }}
                                data-testid={`button-mark-reviewed-${check.id}`}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                Mark reviewed
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle className="text-xl font-bold">Employees & Work Status</CardTitle>
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
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Document Type</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Expiry Date</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {allRows.map((row, index) => {
                        const initials = `${row.firstName[0]}${row.lastName[0]}`.toUpperCase();
                        return (
                          <tr 
                            key={row.id} 
                            className="hover:bg-muted/50 transition-colors duration-150"
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
                                  <Button variant="ghost" size="sm" className="button-transition" data-testid={`button-view-${row.id}`}>
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
    </div>
  );
}
